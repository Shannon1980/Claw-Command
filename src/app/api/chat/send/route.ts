import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitChatMessage } from "@/lib/events/emitActivity";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, message, attachments } = body;

    if (!agentId || !message) {
      return NextResponse.json(
        { error: "agentId and message are required" },
        { status: 400 }
      );
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();

    // Persist to DB (chat_messages table)
    if (pool) {
      await pool.query(
        `INSERT INTO chat_messages (id, agent_id, sender, content, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6)`,
        [messageId, agentId, "user", message, "sent", now]
      );
    }

    // Emit real-time event
    emitChatMessage({
      messageId,
      agentId,
      sender: "user",
      content: message,
      attachments: attachments || [],
    });

    return NextResponse.json({
      id: messageId,
      status: "sent",
      timestamp: now,
    });
  } catch (error) {
    console.error("[Chat Send] Error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
