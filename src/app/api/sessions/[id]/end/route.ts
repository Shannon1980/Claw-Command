import { NextRequest, NextResponse } from "next/server";
import { emitEvent } from "@/lib/events/emitActivity";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await context.params;

  emitEvent("session_event", {
    sessionId,
    action: "ended",
    endedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
