import { NextRequest } from "next/server";
import { eventBus, type MCEvent } from "@/lib/events/eventBus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatSSE(event: MCEvent): string {
  return [
    `id: ${event.id}`,
    `event: ${event.type}`,
    `data: ${JSON.stringify(event.data)}`,
    "",
    "",
  ].join("\n");
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send connection event
      controller.enqueue(
        encoder.encode(
          [
            `id: connected-${Date.now()}`,
            `event: connected`,
            `data: ${JSON.stringify({
              message: "Connected to Claw Command SSE feed",
              timestamp: new Date().toISOString(),
            })}`,
            "",
            "",
          ].join("\n")
        )
      );

      // Subscribe to all events from the event bus
      const unsubscribe = eventBus.onAll((event: MCEvent) => {
        try {
          controller.enqueue(encoder.encode(formatSSE(event)));
        } catch {
          // Stream closed
          unsubscribe();
        }
      });

      // Heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              [
                `id: hb-${Date.now()}`,
                `event: heartbeat`,
                `data: ${JSON.stringify({ timestamp: new Date().toISOString() })}`,
                "",
                "",
              ].join("\n")
            )
          );
        } catch {
          clearInterval(heartbeatInterval);
          unsubscribe();
        }
      }, 30000);

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
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
