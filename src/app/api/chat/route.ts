import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages, activities } from "@/lib/db/schema";
import { connectionString } from "@/lib/db/config";
import { addMessage } from "@/lib/chat/store";

export async function POST(request: Request) {
  try {
    const { agentId, content } = await request.json();

    if (!agentId || !content) {
      return NextResponse.json(
        { error: "agentId and content are required" },
        { status: 400 }
      );
    }

    if (connectionString) {
      try {
        const messageId = crypto.randomUUID();
        await db.insert(chatMessages).values({
          id: messageId,
          agentId,
          sender: "user",
          content,
          status: "sent",
        });
        await db.insert(activities).values({
          id: crypto.randomUUID(),
          eventType: "message_sent",
          resourceType: "chat",
          resourceId: messageId,
          details: JSON.stringify({ agentId, content }),
          createdAt: new Date().toISOString(),
        });
        return NextResponse.json({ success: true, messageId });
      } catch (dbError) {
        console.error("[Chat] DB insert failed, using in-memory store:", dbError);
      }
    }

    const stored = addMessage({ agentId, sender: "user", content });
    return NextResponse.json({
      success: true,
      messageId: stored.id,
      timestamp: stored.timestamp,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
