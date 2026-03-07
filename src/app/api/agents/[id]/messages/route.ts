import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitChatMessage } from "@/lib/events/emitActivity";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) {
    return NextResponse.json([]);
  }

  try {
    const { id } = await params;
    const result = await pool.query(
      `SELECT m.*,
              fa.name AS from_agent_name,
              ta.name AS to_agent_name
       FROM agent_messages m
       LEFT JOIN agents fa ON fa.id = m.from_agent_id
       LEFT JOIN agents ta ON ta.id = m.to_agent_id
       WHERE m.from_agent_id = $1 OR m.to_agent_id = $1
       ORDER BY m.created_at ASC`,
      [id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Agent Messages GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  try {
    const { id: fromAgentId } = await params;
    const body = await request.json();
    const toAgentId = body.toAgentId || body.to_agent_id;
    const content = body.content;

    if (!toAgentId || !content) {
      return NextResponse.json(
        { error: "toAgentId and content are required" },
        { status: 400 }
      );
    }

    const msgId = `amsg-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO agent_messages (id, from_agent_id, to_agent_id, content, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [msgId, fromAgentId, toAgentId, content, now]
    );

    emitChatMessage({
      messageId: msgId,
      agentId: fromAgentId,
      sender: fromAgentId,
      toAgentId,
      content,
    });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Agent Messages POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send message" },
      { status: 500 }
    );
  }
}
