// ─── OpenClaw HTTP Client (server-side) ─────────────────────────────────────

import type {
  OpenClawNode,
  OpenClawSession,
  OpenClawMessage,
  OpenClawChatRequest,
  OpenClawSkill,
  OpenClawSkillCreateRequest,
  OpenClawSkillUpdateRequest,
} from "./types";
import { pool } from "@/lib/db/client";

// Default OpenClaw RPC port
const DEFAULT_URL = "http://localhost:18789";

function getGatewayToken(): string | null {
  return (
    process.env.OPENCLAW_GATEWAY_TOKEN ||
    process.env.OPENCLAW_TOKEN ||
    process.env.GATEWAY_TOKEN ||
    null
  );
}

function getRpcHeaders(): HeadersInit {
  const token = getGatewayToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Resolve the effective gateway base URL.
 * Priority: OPENCLAW_URL env var > first online DB gateway > first DB gateway > DEFAULT_URL
 */
export async function getBaseUrl(): Promise<string> {
  if (process.env.OPENCLAW_URL) {
    return process.env.OPENCLAW_URL;
  }
  if (process.env.OPENCLAW_GATEWAY_URL) {
    return process.env.OPENCLAW_GATEWAY_URL;
  }

  if (pool) {
    try {
      // Prefer an online gateway, fall back to any saved gateway
      const result = await pool.query(
        `SELECT url FROM gateways ORDER BY CASE WHEN status = 'online' THEN 0 ELSE 1 END, created_at DESC LIMIT 1`
      );
      if (result.rows.length > 0 && result.rows[0].url) {
        return result.rows[0].url;
      }
    } catch {
      // DB query failed — fall through to default
    }
  }

  return DEFAULT_URL;
}

export function isConfigured(): boolean {
  return Boolean(process.env.OPENCLAW_URL || process.env.OPENCLAW_GATEWAY_URL || pool);
}

// ─── Gateway RPC helpers ────────────────────────────────────────────────────

export async function isGatewayOnline(): Promise<boolean> {
  const base = await getBaseUrl();
  try {
    const rpcRes = await fetch(base, {
      method: "POST",
      headers: getRpcHeaders(),
      body: JSON.stringify({ jsonrpc: "2.0", method: "node.list", id: Date.now() }),
      signal: AbortSignal.timeout(2500),
    });
    if (rpcRes.ok) return true;
  } catch {
    // fall through
  }

  // Fallback for deployments exposing only /health
  try {
    const healthUrl = base.endsWith("/health") ? base : `${base.replace(/\/$/, "")}/health`;
    const healthRes = await fetch(healthUrl, {
      method: "GET",
      headers: getGatewayToken() ? { Authorization: `Bearer ${getGatewayToken()}` } : undefined,
      signal: AbortSignal.timeout(2500),
    });
    return healthRes.ok;
  } catch {
    return false;
  }
}

async function rpc<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const base = await getBaseUrl();
  try {
    const res = await fetch(base, {
      method: "POST",
      headers: getRpcHeaders(),
      body: JSON.stringify({ jsonrpc: "2.0", method, params, id: Date.now() }),
      // Add a reasonable timeout
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`OpenClaw RPC error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    if (json.error) {
      throw new Error(`OpenClaw RPC error: ${json.error.message || JSON.stringify(json.error)}`);
    }

    return json.result as T;
  } catch (err) {
    // console.error(`[OpenClaw] RPC ${method} failed:`, err);
    throw err;
  }
}

// ─── Node Operations ────────────────────────────────────────────────────────

export async function listNodes(): Promise<OpenClawNode[]> {
  try {
    return await rpc<OpenClawNode[]>("node.list");
  } catch {
    return [];
  }
}

export async function describeNode(nodeId: string): Promise<OpenClawNode | null> {
  try {
    return await rpc<OpenClawNode>("node.describe", { node_id: nodeId });
  } catch {
    return null;
  }
}

export async function invokeNode(
  nodeId: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  return rpc("node.invoke", { node_id: nodeId, ...payload });
}

// ─── Session Operations ─────────────────────────────────────────────────────

export async function listSessions(nodeId?: string): Promise<OpenClawSession[]> {
  try {
    const params: Record<string, unknown> = {};
    if (nodeId) params.node_id = nodeId;
    const result = await rpc<any>("sessions_list", params);
    
    // Normalize result if needed
    if (result && result.sessions) return result.sessions;
    if (Array.isArray(result)) return result;
    return [];
  } catch {
    return [];
  }
}

export async function getSessionHistory(sessionId: string): Promise<OpenClawMessage[]> {
  try {
    return await rpc<OpenClawMessage[]>("sessions_history", { session_id: sessionId });
  } catch {
    return [];
  }
}

export async function sendToSession(
  sessionId: string,
  message: string
): Promise<OpenClawMessage | null> {
  try {
    return await rpc<OpenClawMessage>("sessions_send", {
      session_id: sessionId,
      content: message,
    });
  } catch {
    return null;
  }
}

// ─── Push task from Claw Command to OpenClaw ────────────────────────────────

export type PushTaskResult = { ok: boolean; sessionId?: string; error?: string };

/** Base URL for Claw Command (for context URL in task push) */
function getClawCommandBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Build the agent context URL that OpenClaw can fetch for certifications, tasks, alerts.
 */
export function getAgentContextUrl(agentId: string, format: "text" | "json" = "text"): string {
  const base = getClawCommandBaseUrl();
  return `${base}/api/agent-context?agentId=${encodeURIComponent(agentId)}&scope=all&format=${format}`;
}

/**
 * Push a Claw Command task to OpenClaw so the agent can pick it up.
 * Includes context_url pointing to /api/agent-context so agents can fetch certifications, tasks, alerts.
 */
export async function pushTaskToOpenClaw(params: {
  taskId: string;
  title: string;
  agentId: string;
  status?: string;
  dueDate?: string | null;
}): Promise<PushTaskResult> {
  try {
    const online = await isGatewayOnline();
    if (!online) {
      return { ok: false, error: "Gateway offline" };
    }

    const label = params.dueDate
      ? `${params.title} (due ${params.dueDate})`
      : params.title;

    const contextUrl = getAgentContextUrl(params.agentId);

    const result = await rpc<{ session_id?: string; sessionId?: string }>(
      "sessions_spawn",
      {
        task: label,
        label,
        agent_id: params.agentId,
        agentId: params.agentId,
        context_url: contextUrl,
        contextUrl,
      }
    );

    const sessionId = result?.session_id || result?.sessionId;
    return { ok: true, sessionId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[OpenClaw] pushTaskToOpenClaw failed:", msg);
    return { ok: false, error: msg };
  }
}

// ─── Subagent Operations ────────────────────────────────────────────────────

export type SubagentRun = {
  id: string;
  label?: string;
  status: "running" | "pending" | "completed" | "failed" | "cancelled";
  startTime?: string;
  endTime?: string;
  runtime?: string;
  taskLabel?: string;
  progressPercent?: number;
};

export async function listSubagents(): Promise<SubagentRun[]> {
  try {
    const result = await rpc<any>("subagents_list");
    
    // Handle various response formats
    if (Array.isArray(result)) {
      return result.map((item: any) => ({
        id: item.id || item.sessionId || `subagent-${Date.now()}`,
        label: item.label || item.name || "Unnamed subagent",
        status: item.status || "running",
        startTime: item.startTime || item.created_at || new Date().toISOString(),
        endTime: item.endTime || item.completed_at,
        runtime: item.runtime || item.elapsed,
        taskLabel: item.task || item.taskLabel,
        progressPercent: item.progress || 0,
      }));
    }
    
    return [];
  } catch (err) {
    // console.error("[listSubagents] Error:", err);
    return [];
  }
}

// ─── Skill Operations ────────────────────────────────────────────────────

export async function listSkills(): Promise<OpenClawSkill[]> {
  try {
    const result = await rpc<any>("skills.list");
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.skills)) return result.skills;
    return [];
  } catch {
    return [];
  }
}

export async function getSkill(skillId: string): Promise<OpenClawSkill | null> {
  try {
    return await rpc<OpenClawSkill>("skills.get", { id: skillId });
  } catch {
    return null;
  }
}

export async function createSkill(
  data: OpenClawSkillCreateRequest
): Promise<OpenClawSkill | null> {
  try {
    return await rpc<OpenClawSkill>("skills.create", data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function updateSkill(
  skillId: string,
  data: OpenClawSkillUpdateRequest
): Promise<OpenClawSkill | null> {
  try {
    return await rpc<OpenClawSkill>("skills.update", {
      id: skillId,
      ...data,
    } as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function deleteSkill(skillId: string): Promise<boolean> {
  try {
    await rpc("skills.delete", { id: skillId });
    return true;
  } catch {
    return false;
  }
}

export async function toggleSkill(
  skillId: string,
  enabled: boolean
): Promise<OpenClawSkill | null> {
  try {
    return await rpc<OpenClawSkill>("skills.update", { id: skillId, enabled });
  } catch {
    return null;
  }
}

// ─── Chat Completions (OpenAI-compatible) ───────────────────────────────────

export async function chatCompletion(
  request: OpenClawChatRequest
): Promise<ReadableStream<Uint8Array>> {
  const base = await getBaseUrl();
  // Strip trailing slash if present
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  // If base is just http://host:port, append /v1/chat/completions
  // If base already has path, use it. But OpenClaw usually is just host:port
  const url = `${normalizedBase}/v1/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: getRpcHeaders(),
    body: JSON.stringify({ ...request, stream: true }),
  });

  if (!res.ok) {
    throw new Error(`OpenClaw chat error: ${res.status} ${res.statusText}`);
  }

  if (!res.body) {
    throw new Error("OpenClaw chat: no response body");
  }

  // Transform SSE stream (data: {...}) into plain text chunks
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // Skip unparseable SSE frames
            }
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `[ERROR] ${err instanceof Error ? err.message : "Stream error"}`
          )
        );
      } finally {
        controller.close();
      }
    },
  });
}
