import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

/**
 * Mission Control–compatible task queue.
 * GET /api/mc/tasks/queue?agent=veronica
 * Agents poll this to get their next task.
 * See: https://github.com/builderz-labs/mission-control
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agent =
    searchParams.get("agent") ||
    request.headers.get("x-agent-name") ||
    request.headers.get("x-agent-id");

  if (!agent) {
    return NextResponse.json(
      { error: "agent or x-agent-name header required" },
      { status: 400 }
    );
  }

  if (!pool || !connectionString) {
    return NextResponse.json(
      { task: null, reason: "no_tasks_available", agent, timestamp: Date.now() },
      { status: 200 }
    );
  }

  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.depends_on_shannon,
              t.assigned_to_agent_id, t.created_at, t.updated_at
       FROM tasks t
       WHERE t.assigned_to_agent_id = $1
         AND t.status IN ('backlog', 'ready', 'in_progress')
       ORDER BY
         CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 2 END,
         t.due_date ASC NULLS LAST,
         t.updated_at DESC
       LIMIT 1`,
      [agent]
    );

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({
        task: null,
        reason: "no_tasks_available",
        agent,
        timestamp: Date.now(),
      });
    }

    const task = {
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority || "medium",
      due_date: row.due_date,
      depends_on_shannon: row.depends_on_shannon ?? false,
      assigned_to_agent_id: row.assigned_to_agent_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return NextResponse.json({
      task,
      reason: "assigned",
      agent,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[MC Task Queue] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Queue fetch failed" },
      { status: 500 }
    );
  }
}
