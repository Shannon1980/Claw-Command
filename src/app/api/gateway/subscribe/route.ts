// ─── GET /api/gateway/subscribe ─────────────────────────────────────────────
// SSE endpoint for real-time updates from OpenClaw
// Falls back to polling if SSE is not available

import { NextRequest, NextResponse } from "next/server";
import {
  listNodes,
  listSessions,
  isConfigured,
} from "@/lib/openclaw/client";
import { nodesToAgents } from "@/lib/openclaw/mappers";
import type { GatewayEvent, AgentStatus, QueueItem } from "@/lib/gateway/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max for SSE

export async function GET(req: NextRequest) {
  // Check if client supports SSE
  const acceptHeader = req.headers.get("accept") || "";
  const isSSE = acceptHeader.includes("text/event-stream");

  if (!isSSE) {
    return NextResponse.json(
      { error: "This endpoint requires Accept: text/event-stream" },
      { status: 400 }
    );
  }

  // Create SSE stream
  const responseStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      /** Safely enqueue data, returning false if the stream is closed. */
      function safeSend(data: string): boolean {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(data));
          return true;
        } catch {
          closed = true;
          return false;
        }
      }

      /** Safely close the controller once. */
      function safeClose() {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }

      // Send initial state
      try {
        if (!isConfigured()) {
          const event: GatewayEvent = {
            type: "connection_status",
            status: "disconnected",
            error: { code: "NOT_CONFIGURED", message: "OPENCLAW_URL not set" },
          };
          safeSend(`data: ${JSON.stringify(event)}\n\n`);
          safeClose();
          return;
        }

        // Fetch initial state
        const nodes = await listNodes();
        const sessions = await listSessions();

        const agents = nodesToAgents(nodes);
        const agentStatusMap: Record<string, AgentStatus> = agents.reduce(
          (acc, agent) => {
            acc[agent.id] = {
              id: agent.id,
              name: agent.name,
              status: (agent.status as "active" | "idle" | "offline") || "idle",
              activeTasks: agent.activeTasks,
              lastHeartbeat: agent.lastHeartbeat,
            };
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

        // Send initial state event
        const initialEvent: GatewayEvent = {
          type: "initial_state",
          state: {
            agents: agentStatusMap,
            tasks,
            metrics: {
              totalTokens: 0,
              totalRuntime: 0,
              totalCost: 0,
              activeAgents: Object.values(agentStatusMap).filter(
                (a) => a.status === "active"
              ).length,
              queueLength: tasks.filter((t) => t.status !== "completed")
                .length,
              lastUpdate: new Date().toISOString(),
            },
          },
        };

        if (!safeSend(`data: ${JSON.stringify(initialEvent)}\n\n`)) return;

        // Send connection status
        const connEvent: GatewayEvent = {
          type: "connection_status",
          status: "connected",
        };
        if (!safeSend(`data: ${JSON.stringify(connEvent)}\n\n`)) return;

        // Poll for updates every 2s (configurable)
        const pollInterval = 2000;
        let lastSessions = sessions;

        const pollTimer = setInterval(async () => {
          if (closed) {
            clearInterval(pollTimer);
            return;
          }

          try {
            const newSessions = await listSessions();
            const newNodes = await listNodes();
            const newAgents = nodesToAgents(newNodes);

            // Check for new/updated sessions
            for (const session of newSessions) {
              if (closed) break;

              const sessionId = session.session_id || session.key;
              const oldSession = lastSessions.find(
                (s) => (s.session_id || s.key) === sessionId
              );

              // New task
              if (!oldSession) {
                const event: GatewayEvent = {
                  type: "task_queued",
                  task: {
                    id: sessionId || "unknown",
                    taskName: session.label || `Session ${(sessionId || "").slice(0, 8)}`,
                    agentId: session.node_id || session.agentId || "unknown",
                    status: (session.status as "queued" | "running" | "completed" | "failed") || "running",
                    queuedAt: session.created_at || new Date().toISOString(),
                  },
                };
                safeSend(`data: ${JSON.stringify(event)}\n\n`);
              }

              // Status change
              if (oldSession && oldSession.status !== session.status) {
                if (session.status === "completed") {
                  const event: GatewayEvent = {
                    type: "task_completed",
                    taskId: sessionId || "unknown",
                  };
                  safeSend(`data: ${JSON.stringify(event)}\n\n`);
                } else {
                  const event: GatewayEvent = {
                    type: "task_queued",
                    task: {
                      id: sessionId || "unknown",
                      taskName: session.label || `Session ${(sessionId || "").slice(0, 8)}`,
                      agentId: session.node_id || session.agentId || "unknown",
                      status: (session.status as "queued" | "running" | "completed" | "failed") || "running",
                      queuedAt: session.created_at || new Date().toISOString(),
                    },
                  };
                  safeSend(`data: ${JSON.stringify(event)}\n\n`);
                }
              }
            }

            // Update agent statuses
            for (const agent of newAgents) {
              if (closed) break;

              const oldAgent = nodesToAgents(
                [nodes.find((n) => n.node_id === agent.id)!].filter(Boolean)
              )[0];

              if (!oldAgent || oldAgent.status !== agent.status) {
                const event: GatewayEvent = {
                  type: "agent_status_changed",
                  agentId: agent.id,
                  status: {
                    id: agent.id,
                    name: agent.name,
                    status: (agent.status as "active" | "idle" | "offline") || "idle",
                    activeTasks: agent.activeTasks,
                    lastHeartbeat: agent.lastHeartbeat,
                  },
                };
                safeSend(`data: ${JSON.stringify(event)}\n\n`);
              }
            }

            lastSessions = newSessions;
          } catch (err) {
            if (closed) return;
            console.error("[Gateway Subscribe] Poll error:", err);
            const event: GatewayEvent = {
              type: "connection_status",
              status: "error",
              error: {
                code: "POLL_ERROR",
                message: err instanceof Error ? err.message : "Poll error",
              },
            };
            safeSend(`data: ${JSON.stringify(event)}\n\n`);
          }
        }, pollInterval);

        // Cleanup on disconnect (single handler to avoid double-close)
        req.signal.addEventListener("abort", () => {
          clearInterval(pollTimer);
          safeClose();
        });
      } catch (err) {
        console.error("[Gateway Subscribe] Startup error:", err);
        const event: GatewayEvent = {
          type: "connection_status",
          status: "error",
          error: {
            code: "STARTUP_ERROR",
            message: err instanceof Error ? err.message : "Startup error",
          },
        };
        safeSend(`data: ${JSON.stringify(event)}\n\n`);
        safeClose();
      }
    },
  });

  // Return SSE response
  return new NextResponse(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering on Nginx
    },
  });
}
