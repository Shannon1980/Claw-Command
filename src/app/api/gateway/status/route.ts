// ─── GET /api/gateway/status ────────────────────────────────────────────────
// Polling fallback endpoint for real-time updates from OpenClaw

import { NextResponse } from "next/server";
import {
  listNodes,
  listSessions,
  isConfigured,
} from "@/lib/openclaw/client";
import { nodesToAgents } from "@/lib/openclaw/mappers";
import type { AgentStatus, QueueItem, GatewayMetrics } from "@/lib/gateway/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { error: "OpenClaw gateway not configured" },
        { status: 503 }
      );
    }

    const [nodes, sessions] = await Promise.all([listNodes(), listSessions()]);
    const agents = nodesToAgents(nodes);

    const agentStatusMap: Record<string, AgentStatus> = agents.reduce(
      (acc, agent) => {
        acc[agent.id] = agent;
        return acc;
      },
      {} as Record<string, AgentStatus>
    );

    const tasks: QueueItem[] = sessions.map((session) => ({
      id: session.session_id || session.key || "unknown",
      taskName: session.label || `Session ${(session.session_id || session.key || "").slice(0, 8)}`,
      agentId: session.node_id || session.agentId || "unknown",
      status: (session.status as "queued" | "running" | "completed" | "failed") || "running",
      queuedAt: session.created_at || new Date().toISOString(),
      startedAt: session.created_at || new Date().toISOString(),
      completedAt:
        session.status === "completed" ? session.updated_at : undefined,
    }));

    const metrics: GatewayMetrics = {
      totalTokens: 0,
      totalRuntime: 0,
      totalCost: 0,
      activeAgents: agents.filter((a) => a.status === "active").length,
      queueLength: tasks.filter((t) => t.status !== "completed").length,
      lastUpdate: new Date().toISOString(),
    };

    return NextResponse.json({
      connected: true,
      agents: agentStatusMap,
      tasks,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Gateway Status] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch gateway status" },
      { status: 500 }
    );
  }
}
