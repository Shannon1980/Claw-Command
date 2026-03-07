import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/client";
import { emitAgentStatus } from "@/lib/events/emitActivity";

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
    const currentTaskId = (body.current_task_id || body.currentTaskId || body.current_task) as string | undefined;
    const includeTasks = request.nextUrl.searchParams.get("pending_tasks") === "true";

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

    if (includeTasks) {
      const tasksRes = await pool.query(
        `SELECT id, title, status, priority, due_date, depends_on_shannon, created_at, updated_at
         FROM tasks
         WHERE assigned_to_agent_id = $1 AND status IN ('backlog', 'ready', 'in_progress', 'review')
         ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, due_date ASC NULLS LAST`,
        [id]
      );

      return NextResponse.json({
        success: true,
        agent: id,
        pending_tasks: tasksRes.rows.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          priority: row.priority || "medium",
          due_date: row.due_date,
          depends_on_shannon: row.depends_on_shannon ?? false,
          created_at: row.created_at,
          updated_at: row.updated_at,
        })),
        timestamp: Date.now(),
      });
    }

    return NextResponse.json({ ok: true, timestamp: now });
  } catch (error) {
    console.error("[Agent Heartbeat] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Heartbeat failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) {
    return NextResponse.json({ agent: (await params).id, pending_tasks: [], timestamp: Date.now() });
  }

  try {
    const { id } = await params;

    const tasksRes = await pool.query(
      `SELECT id, title, status, priority, due_date, depends_on_shannon, created_at, updated_at
       FROM tasks
       WHERE assigned_to_agent_id = $1 AND status IN ('backlog', 'ready', 'in_progress', 'review')
       ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, due_date ASC NULLS LAST`,
      [id]
    );

    return NextResponse.json({
      agent: id,
      pending_tasks: tasksRes.rows.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        priority: row.priority || "medium",
        due_date: row.due_date,
        depends_on_shannon: row.depends_on_shannon ?? false,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[Agent Heartbeat GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Heartbeat fetch failed" },
      { status: 500 }
    );
  }
}
