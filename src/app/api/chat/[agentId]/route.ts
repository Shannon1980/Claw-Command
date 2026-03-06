import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getAgentChatHistory } from "@/lib/mock-chat";
import { getMessages } from "@/lib/chat/store";

function toApiMessage(
  msg: { id: string; agentId: string; sender: string; content: string; timestamp: string }
) {
  return {
    id: msg.id,
    agentId: msg.agentId,
    sender: msg.sender === "user" ? "user" : "agent",
    content: msg.content,
    timestamp: msg.timestamp,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await context.params;

  try {
    const rows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.agentId, agentId))
      .orderBy(asc(chatMessages.createdAt));

    if (rows.length > 0) {
      const messages = rows.map((row) =>
        toApiMessage({
          id: row.id,
          agentId: row.agentId,
          sender: row.sender ?? "user",
          content: row.content,
          timestamp: row.createdAt?.toISOString() ?? new Date().toISOString(),
        })
      );
      return NextResponse.json(messages);
    }
  } catch (error) {
    console.error("[Chat History API] DB error:", error);
  }

  const inMemory = getMessages(agentId);
  if (inMemory.length > 0) {
    return NextResponse.json(inMemory.map(toApiMessage));
  }

  const history = getAgentChatHistory(agentId);
  const messages = history.map((msg) =>
    toApiMessage({
      id: msg.id,
      agentId: msg.agentId,
      sender: msg.sender,
      content: msg.content,
      timestamp:
        msg.timestamp instanceof Date
          ? msg.timestamp.toISOString()
          : String(msg.timestamp),
    })
  );
  return NextResponse.json(messages);
}
