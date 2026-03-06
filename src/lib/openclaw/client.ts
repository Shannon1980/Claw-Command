// ─── OpenClaw HTTP Client (server-side) ─────────────────────────────────────

import type {
  OpenClawNode,
  OpenClawSession,
  OpenClawMessage,
  OpenClawChatRequest,
} from "./types";

// Default OpenClaw RPC port
const DEFAULT_URL = "http://localhost:18789";

export function getBaseUrl(): string {
  // Prefer OPENCLAW_URL if set, otherwise fallback to DEFAULT_URL
  return process.env.OPENCLAW_URL || DEFAULT_URL;
}

export function isConfigured(): boolean {
  return true; // Assume configured for now, or check env var
}

// ─── Gateway RPC helpers ────────────────────────────────────────────────────

export async function isGatewayOnline(): Promise<boolean> {
  try {
    const res = await fetch(getBaseUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "node.list", id: Date.now() }),
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function rpc<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const base = getBaseUrl();
  try {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

/**
 * Push a Claw Command task to OpenClaw so the agent can pick it up.
 * Tries sessions_spawn RPC; if unavailable, logs and returns { ok: false }.
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

    const result = await rpc<{ session_id?: string; sessionId?: string }>(
      "sessions_spawn",
      {
        task: label,
        label,
        agent_id: params.agentId,
        agentId: params.agentId,
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

// ─── Chat Completions (OpenAI-compatible) ───────────────────────────────────

export async function chatCompletion(
  request: OpenClawChatRequest
): Promise<ReadableStream<Uint8Array>> {
  const base = getBaseUrl();
  // Strip trailing slash if present
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  // If base is just http://host:port, append /v1/chat/completions
  // If base already has path, use it. But OpenClaw usually is just host:port
  const url = `${normalizedBase}/v1/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
