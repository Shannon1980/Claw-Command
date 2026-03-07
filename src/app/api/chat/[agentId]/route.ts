import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { getMessages } from "@/lib/chat/store";

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, sender TEXT NOT NULL,
      content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'sent',
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  schemaReady = true;
}

interface ApiMessage {
  id: string;
  agentId: string;
  sender: string;
  content: string;
  timestamp: string;
}

function toApiMessage(
  msg: { id: string; agentId: string; sender: string; content: string; timestamp: string }
): ApiMessage {
  return {
    id: msg.id,
    agentId: msg.agentId,
    sender: msg.sender === "user" ? "user" : "agent",
    content: msg.content,
    timestamp: msg.timestamp,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await context.params;

  // Try database first
  if (pool) {
    try {
      await ensureSchema();
      const result = await pool.query(
        `SELECT id, agent_id, sender, content, created_at
         FROM chat_messages
         WHERE agent_id = $1
         ORDER BY created_at ASC`,
        [agentId]
      );

      if (result.rows.length > 0) {
        const messages = result.rows.map((row: Record<string, unknown>) =>
          toApiMessage({
            id: row.id as string,
            agentId: row.agent_id as string,
            sender: (row.sender as string) ?? "user",
            content: row.content as string,
            timestamp: row.created_at
              ? new Date(row.created_at as string).toISOString()
              : new Date().toISOString(),
          })
        );
        return NextResponse.json(messages);
      }
    } catch (error) {
      console.error("[Chat History API] DB error:", error);
    }
  }

  // Fall back to in-memory store
  const inMemory = getMessages(agentId);
  if (inMemory.length > 0) {
    return NextResponse.json(inMemory.map(toApiMessage));
  }

  return NextResponse.json([]);
}
