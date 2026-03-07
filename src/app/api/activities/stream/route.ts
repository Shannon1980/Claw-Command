/**
 * GET /api/activities/stream
 * SSE endpoint for real-time OpenClaw activity updates.
 * Polls OpenClaw every 3s, syncs to DB, broadcasts new activities to connected clients.
 */

import { pool } from "@/lib/db/client";
import { NextRequest } from "next/server";
import { syncActivities } from "@/lib/activities/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function sseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const accept = req.headers.get("accept") || "";
  if (!accept.includes("text/event-stream")) {
    return new Response(
      JSON.stringify({ error: "Accept: text/event-stream required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const POLL_INTERVAL_MS = 3000;

  const stream = new ReadableStream({
    async start(controller) {
      // Send connected
      controller.enqueue(
        encoder.encode(
          sseMessage("connected", {
            message: "Activity stream connected",
            timestamp: new Date().toISOString(),
          })
        )
      );

      const poll = async () => {
        try {
          const result = await syncActivities();

          if (result.newActivities.length > 0) {
            // Enrich with agent name/emoji for display
            const enriched = await Promise.all(
              result.newActivities.map(async (act) => {
                let agentName = "System";
                let agentEmoji = "⚙️";
                if (act.actorAgentId && pool) {
                  const res = await pool.query(
                    "SELECT name, emoji FROM agents WHERE id = $1",
                    [act.actorAgentId]
                  );
                  if (res.rows[0]) {
                    agentName = res.rows[0].name;
                    agentEmoji = res.rows[0].emoji || "🤖";
                  }
                }
                let description = act.eventType.replace(/_/g, " ");
                try {
                  const d = JSON.parse(act.details);
                  if (d?.message) description = d.message;
                } catch {
                  /* ignore */
                }
                return {
                  id: act.id,
                  agent_name: agentName,
                  agent_emoji: agentEmoji,
                  event_type: act.eventType,
                  description,
                  timestamp: act.createdAt,
                  metadata: {},
                };
              })
            );

            controller.enqueue(
              encoder.encode(sseMessage("new_activity", { activities: enriched }))
            );
          }

          if (result.archivedCount > 0) {
            controller.enqueue(
              encoder.encode(
                sseMessage("archived", {
                  count: result.archivedCount,
                  timestamp: new Date().toISOString(),
                })
              )
            );
          }
        } catch (err) {
          console.error("[Activity stream] Sync error:", err);
        }
      };

      // Initial sync
      await poll();

      const interval = setInterval(async () => {
        if (req.signal.aborted) {
          clearInterval(interval);
          return;
        }
        await poll();
      }, POLL_INTERVAL_MS);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
