import { NextRequest, NextResponse } from "next/server";
import { getAgentChatHistory } from "@/lib/mock-chat";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await context.params;
    const history = getAgentChatHistory(agentId);
    // Transform to ChatWindow format: content→message, user→shannon
    const messages = history.map((msg) => ({
      id: msg.id,
      agentId: msg.agentId,
      sender: msg.sender === "user" ? "shannon" : "agent",
      message: msg.content,
      timestamp:
        msg.timestamp instanceof Date
          ? msg.timestamp.toISOString()
          : String(msg.timestamp),
    }));
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[Chat History API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}
