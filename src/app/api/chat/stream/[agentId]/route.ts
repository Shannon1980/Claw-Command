import { NextRequest } from "next/server";
import { eventBus } from "@/lib/events/eventBus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE endpoint for real-time chat messages for a specific agent.
 * Clients subscribe here and receive new messages + typing events instantly.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

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

      function cleanup() {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      }

      // Send connection confirmation
      safeSend(
        `id: connected-${Date.now()}\nevent: connected\ndata: ${JSON.stringify({
          agentId,
          timestamp: new Date().toISOString(),
        })}\n\n`
      );

      // Listen for chat events targeting this agent
      const unsubscribe = eventBus.on("chat_message", (event) => {
        const data = event.data;
        if (data.agentId !== agentId) return;

        if (!safeSend(
          `id: ${event.id}\nevent: ${data.event || "chat_message"}\ndata: ${JSON.stringify(data)}\n\n`
        )) {
          cleanup();
        }
      });

      // Heartbeat every 15s
      const heartbeat = setInterval(() => {
        if (!safeSend(
          `id: hb-${Date.now()}\nevent: heartbeat\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`
        )) {
          cleanup();
        }
      }, 15000);

      // Clean up on disconnect
      request.signal.addEventListener("abort", () => {
        cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
