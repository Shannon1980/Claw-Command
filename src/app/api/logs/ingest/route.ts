import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { emitLogEntry } from "@/lib/events/emitActivity";

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { agentId, sessionId, level, message, metadata } = body;

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const id = `log-${Date.now()}`;
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO agent_logs (id, agent_id, session_id, level, message, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        agentId || null,
        sessionId || null,
        level || "info",
        message,
        metadata ? JSON.stringify(metadata) : null,
        now,
      ]
    );

    emitLogEntry({
      agentId: agentId || undefined,
      level: level || "info",
      message,
      logId: id,
      sessionId: sessionId || undefined,
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error("[Logs Ingest] Error:", error);
    return NextResponse.json(
      { error: "Failed to ingest log" },
      { status: 500 }
    );
  }
}
