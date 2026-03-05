import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getAgentChatHistory } from "@/lib/mock-chat";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await context.params;

    const rows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.agentId, agentId))
      .orderBy(asc(chatMessages.createdAt));

    if (rows.length > 0) {
      const messages = rows.map((row) => ({
        id: row.id,
        agentId: row.agentId,
        sender: row.sender === "user" ? "shannon" : "agent",
        message: row.content,
        timestamp: row.createdAt?.toISOString() ?? new Date().toISOString(),
      }));
      return NextResponse.json({ messages });
    }

    // Fallback to mock when DB has no messages
    const history = getAgentChatHistory(agentId);
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
    // Fallback to mock when DB unavailable
    try {
      const { agentId } = await context.params;
      const history = getAgentChatHistory(agentId);
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
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch chat history" },
        { status: 500 }
      );
    }
  }
}
