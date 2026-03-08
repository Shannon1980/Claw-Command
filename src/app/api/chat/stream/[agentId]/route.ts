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
      // Send connection confirmation
      controller.enqueue(
        encoder.encode(
          `id: connected-${Date.now()}\nevent: connected\ndata: ${JSON.stringify({
            agentId,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );

      // Listen for chat events targeting this agent
      const unsubscribe = eventBus.on("chat_message", (event) => {
        const data = event.data;
        if (data.agentId !== agentId) return;

        try {
          controller.enqueue(
            encoder.encode(
              `id: ${event.id}\nevent: ${data.event || "chat_message"}\ndata: ${JSON.stringify(data)}\n\n`
            )
          );
        } catch {
          unsubscribe();
        }
      });

      // Heartbeat every 15s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `id: hb-${Date.now()}\nevent: heartbeat\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`
            )
          );
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15000);

      // Clean up on disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
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
