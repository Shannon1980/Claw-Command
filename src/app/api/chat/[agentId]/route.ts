import { NextRequest, NextResponse } from "next/server";
import { getAgentChatHistory } from "@/lib/mock-chat";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const history = getAgentChatHistory(agentId);
    return NextResponse.json(history);
  } catch (error) {
    console.error("[Chat History API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}
