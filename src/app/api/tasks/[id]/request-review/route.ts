import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitTaskUpdate, emitNotification } from "@/lib/events/emitActivity";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const now = new Date().toISOString();

    // Update task status to review
    const taskResult = await pool.query(
      `UPDATE tasks
       SET status = 'review',
           updated_at = $1
       WHERE id = $2
       RETURNING
         id, title, assigned_to_agent_id, depends_on_shannon,
         status, priority, due_date, created_at, updated_at`,
      [now, id]
    );

    if (taskResult.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = taskResult.rows[0];

    // Create activity record
    await pool.query(
      `INSERT INTO activities (id, actor_agent_id, event_type, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        task.assigned_to_agent_id,
        "review_requested",
        "task",
        id,
        JSON.stringify({
          message: `Review requested for task: ${task.title}`,
          new_status: "review",
        }),
        now,
      ]
    );

    // Fetch agent info
    let agentName = "Shannon";
    let agentEmoji = "👤";
    if (task.assigned_to_agent_id) {
      const agentResult = await pool.query(
        "SELECT name, emoji FROM agents WHERE id = $1",
        [task.assigned_to_agent_id]
      );
      agentName = agentResult.rows[0]?.name ?? agentName;
      agentEmoji = agentResult.rows[0]?.emoji ?? agentEmoji;
    }

    const response = {
      ...task,
      agent_name: agentName,
      agent_emoji: agentEmoji,
    };

    emitTaskUpdate({ taskId: id, action: "review_requested", task: response });
    emitNotification({
      title: "Review Requested",
      body: `Review requested for: ${task.title}`,
      type: "review_request",
      taskId: id,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Tasks API] Request review error:", error);
    return NextResponse.json(
      { error: "Failed to request review" },
      { status: 500 }
    );
  }
}
