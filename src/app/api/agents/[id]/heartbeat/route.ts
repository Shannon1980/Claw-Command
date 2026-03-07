import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitAgentStatus } from "@/lib/events/emitActivity";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

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
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = body.status as string | undefined;
    const currentTaskId = (body.current_task_id || body.currentTaskId) as string | undefined;

    const now = new Date().toISOString();

    await pool.query(
      `UPDATE agents
       SET updated_at = $1,
           status = COALESCE($2, status),
           current_task_id = COALESCE($3, current_task_id)
       WHERE id = $4`,
      [now, status || null, currentTaskId || null, id]
    );

    emitAgentStatus({
      agentId: id,
      status: status || "heartbeat",
      timestamp: now,
    });

    return NextResponse.json({ ok: true, timestamp: now });
  } catch (error) {
    console.error("[Agent Heartbeat] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Heartbeat failed" },
      { status: 500 }
    );
  }
}
