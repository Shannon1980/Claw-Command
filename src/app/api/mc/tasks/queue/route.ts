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

type QueueReason =
  | "continue_current"
  | "assigned"
  | "at_capacity"
  | "no_tasks_available";

/**
 * Mission Control–compatible task queue.
 * GET /api/mc/tasks/queue?agent=veronica&max_capacity=1
 * Agents poll this to get their next task.
 * See: https://github.com/builderz-labs/mission-control
 */
export async function GET(request: NextRequest) {
  const authError = requireMcAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const agent =
    searchParams.get("agent") ||
    request.headers.get("x-agent-name") ||
    request.headers.get("x-agent-id");
  const maxCapacity = Math.min(
    20,
    Math.max(1, parseInt(searchParams.get("max_capacity") || "1", 10) || 1)
  );

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
    // 1. continue_current: if agent has current_task_id and it's active, return it
    const agentRow = await pool.query(
      `SELECT current_task_id FROM agents WHERE id = $1`,
      [agent]
    );
    const currentTaskId = agentRow.rows[0]?.current_task_id;
    if (currentTaskId) {
      const currentTaskRes = await pool.query(
        `SELECT id, title, status, priority, due_date, depends_on_shannon,
                assigned_to_agent_id, created_at, updated_at
         FROM tasks
         WHERE id = $1 AND assigned_to_agent_id = $2
           AND status IN ('in_progress', 'review')`,
        [currentTaskId, agent]
      );
      const row = currentTaskRes.rows[0];
      if (row) {
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
          reason: "continue_current" as QueueReason,
          agent,
          timestamp: Date.now(),
        });
      }
    }

    // 2. at_capacity: count active tasks (in_progress, review)
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM tasks
       WHERE assigned_to_agent_id = $1 AND status IN ('in_progress', 'review')`,
      [agent]
    );
    const activeCount = countRes.rows[0]?.cnt ?? 0;
    if (activeCount >= maxCapacity) {
      return NextResponse.json({
        task: null,
        reason: "at_capacity" as QueueReason,
        agent,
        timestamp: Date.now(),
      });
    }

    // 3. assigned: get next task
    const result = await pool.query(
      `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.depends_on_shannon,
              t.assigned_to_agent_id, t.created_at, t.updated_at
       FROM tasks t
       WHERE t.assigned_to_agent_id = $1
         AND t.status IN ('backlog', 'ready', 'in_progress', 'review')
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
        reason: "no_tasks_available" as QueueReason,
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
      reason: "assigned" as QueueReason,
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
