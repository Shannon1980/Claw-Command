// ─── GET /api/gateway/status ────────────────────────────────────────────────
// Returns system health: DB metrics + OpenClaw gateway status

import { NextResponse } from "next/server";
import { pool } from "@/lib/db/client";
import {
  listNodes,
  listSessions,
  isConfigured,
} from "@/lib/openclaw/client";
import { nodesToAgents } from "@/lib/openclaw/mappers";
import type { AgentStatus, QueueItem, GatewayMetrics } from "@/lib/gateway/types";
import { getMcAuthStatus } from "@/lib/mc/auth";

export const dynamic = "force-dynamic";

/** Measure DB latency and size */
async function getDbHealth(): Promise<{
  latencyMs: number | null;
  dbSizeMb: number | null;
  uptime: string | null;
  errorCount24h: number;
}> {
  if (!pool) {
    return { latencyMs: null, dbSizeMb: null, uptime: null, errorCount24h: 0 };
  }

  try {
    const start = Date.now();
    const [sizeRes, errorRes] = await Promise.all([
      pool.query(`SELECT pg_database_size(current_database()) AS size`),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM agent_logs WHERE level = 'error' AND created_at::timestamptz > NOW() - INTERVAL '24 hours'`
      ).catch(() => ({ rows: [{ count: 0 }] })),
    ]);
    const latencyMs = Date.now() - start;

    const sizeBytes = Number(sizeRes.rows[0]?.size ?? 0);
    const dbSizeMb = Math.round((sizeBytes / (1024 * 1024)) * 10) / 10;

    return {
      latencyMs,
      dbSizeMb,
      uptime: null, // No straightforward way to get app uptime
      errorCount24h: errorRes.rows[0]?.count ?? 0,
    };
  } catch {
    return { latencyMs: null, dbSizeMb: null, uptime: null, errorCount24h: 0 };
  }
}

export async function GET() {
  // Always gather DB health regardless of OpenClaw status
  const dbHealth = await getDbHealth();

  let gatewayConnected = false;
  let agentStatusMap: Record<string, AgentStatus> = {};
  let tasks: QueueItem[] = [];
  let metrics: GatewayMetrics = {
    totalTokens: 0,
    totalRuntime: 0,
    totalCost: 0,
    activeAgents: 0,
    queueLength: 0,
    lastUpdate: new Date().toISOString(),
  };

  // Try to reach OpenClaw gateway (non-blocking — dashboard still works without it)
  if (isConfigured()) {
    try {
      const [nodes, sessions] = await Promise.all([listNodes(), listSessions()]);
      const agents = nodesToAgents(nodes);
      gatewayConnected = nodes.length > 0 || sessions.length > 0;

      agentStatusMap = agents.reduce(
        (acc, agent) => {
          acc[agent.id] = agent;
          return acc;
        },
        {} as Record<string, AgentStatus>
      );

      tasks = sessions.map((session) => ({
        id: session.session_id || session.key || "unknown",
        taskName: session.label || `Session ${(session.session_id || session.key || "").slice(0, 8)}`,
        agentId: session.node_id || session.agentId || "unknown",
        status: (session.status as "queued" | "running" | "completed" | "failed") || "running",
        queuedAt: session.created_at || new Date().toISOString(),
        startedAt: session.created_at || new Date().toISOString(),
        completedAt:
          session.status === "completed" ? session.updated_at : undefined,
      }));

      metrics = {
        totalTokens: 0,
        totalRuntime: 0,
        totalCost: 0,
        activeAgents: agents.filter((a) => a.status === "active").length,
        queueLength: tasks.filter((t) => t.status !== "completed").length,
        lastUpdate: new Date().toISOString(),
      };
    } catch (err) {
      console.warn("[Gateway Status] OpenClaw unreachable:", err instanceof Error ? err.message : err);
      // Gateway offline is fine — we still return DB health below
    }
  }

  // Determine connected status: gateway online OR database available
  const connected = gatewayConnected || pool !== null;
  const mcAuth = getMcAuthStatus();

  return NextResponse.json({
    connected,
    latencyMs: dbHealth.latencyMs,
    dbSizeMb: dbHealth.dbSizeMb,
    uptime: dbHealth.uptime,
    errorCount24h: dbHealth.errorCount24h,
    agents: agentStatusMap,
    tasks,
    metrics,
    mcAuth,
    timestamp: new Date().toISOString(),
  });
}
