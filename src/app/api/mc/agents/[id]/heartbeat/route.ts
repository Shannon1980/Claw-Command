import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { requireMcAuth } from "@/lib/mc/auth";

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

/**
 * Mission Control–compatible agent heartbeat.
 * POST /api/mc/agents/veronica/heartbeat
 * Agents call this to report they're alive; returns pending tasks.
 * See: https://github.com/builderz-labs/mission-control
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireMcAuth(request);
  if (authError) return authError;

  const { id: agentId } = await context.params;

  if (!pool || !connectionString) {
    return NextResponse.json({
      success: true,
      agent: agentId,
      pending_tasks: [],
      timestamp: Date.now(),
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const status = body.status as string | undefined;
    const currentTask = body.current_task as string | undefined;

    const now = new Date().toISOString();
    await pool.query(
      `UPDATE agents SET status = COALESCE($2, status), current_task_id = COALESCE($3, current_task_id), updated_at = $1 WHERE id = $4`,
      [now, status || null, currentTask || null, agentId]
    );

    const tasksRes = await pool.query(
      `SELECT id, title, status, priority, due_date, depends_on_shannon, created_at, updated_at
       FROM tasks
       WHERE assigned_to_agent_id = $1 AND status IN ('backlog', 'ready', 'in_progress', 'review')
       ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, due_date ASC NULLS LAST`,
      [agentId]
    );

    const pending_tasks = tasksRes.rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority || "medium",
      due_date: row.due_date,
      depends_on_shannon: row.depends_on_shannon ?? false,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      agent: agentId,
      pending_tasks,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[MC Heartbeat] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Heartbeat failed" },
      { status: 500 }
    );
  }
}

/**
 * GET - Return heartbeat data (pending tasks) without updating.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireMcAuth(request);
  if (authError) return authError;

  const { id: agentId } = await context.params;

  if (!pool || !connectionString) {
    return NextResponse.json({
      agent: agentId,
      pending_tasks: [],
      messages: [],
      timestamp: Date.now(),
    });
  }

  try {
    const tasksRes = await pool.query(
      `SELECT id, title, status, priority, due_date, depends_on_shannon, created_at, updated_at
       FROM tasks
       WHERE assigned_to_agent_id = $1 AND status IN ('backlog', 'ready', 'in_progress', 'review')
       ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, due_date ASC NULLS LAST`,
      [agentId]
    );

    const pending_tasks = tasksRes.rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority || "medium",
      due_date: row.due_date,
      depends_on_shannon: row.depends_on_shannon ?? false,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({
      agent: agentId,
      pending_tasks,
      messages: [],
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[MC Heartbeat GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Heartbeat fetch failed" },
      { status: 500 }
    );
  }
}
