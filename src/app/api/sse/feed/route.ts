import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let eventCounter = 0;

function createSSEMessage(
  eventType: string,
  data: unknown,
  id?: string
): string {
  const eventId = id || `evt-${++eventCounter}`;
  return [
    `id: ${eventId}`,
    `event: ${eventType}`,
    `data: ${JSON.stringify(data)}`,
    "",
    "",
  ].join("\n");
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(
          createSSEMessage("connected", {
            message: "Connected to Claw Command SSE feed",
            timestamp: new Date().toISOString(),
          })
        )
      );

      // Heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              createSSEMessage("heartbeat", {
                timestamp: new Date().toISOString(),
              })
            )
          );
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Clean up on disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });

      // TODO: Hook into real-time sync events
      // When /api/sync is called, push updates through this stream
      // For now, send a demo event after 5 seconds
      setTimeout(() => {
        try {
          controller.enqueue(
            encoder.encode(
              createSSEMessage("agent_update", {
                agentId: "forge",
                status: "active",
                currentTask: "Building Claw Command features",
                timestamp: new Date().toISOString(),
              })
            )
          );
        } catch {
          // Stream may be closed
        }
      }, 5000);
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
