import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, message } = body;

    // TODO: Integrate with OpenClaw to route messages to actual agents
    // For now, return an echo response
    return NextResponse.json({
      id: Date.now().toString(),
      agentId,
      sender: "agent",
      content: `[Echo from ${agentId}] Received: ${message}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
