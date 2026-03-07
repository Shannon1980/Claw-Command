import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Parse optional reason from request body
    let reason = "";
    try {
      const body = await request.json();
      reason = body.reason || "";
    } catch {
      // No body or invalid JSON, continue with empty reason
    }

    // Update task: keep status as blocked, keep depends_on_shannon true
    const taskResult = await pool.query(
      `UPDATE tasks 
       SET status = 'blocked', 
           updated_at = $1
       WHERE id = $2
       RETURNING 
         id, title, assigned_to_agent_id, depends_on_shannon, 
         status, due_date, created_at, updated_at`,
      [new Date().toISOString(), id]
    );

    if (taskResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const task = taskResult.rows[0];

    // Log activity event with rejection reason
    await pool.query(
      `INSERT INTO activities (id, actor_agent_id, event_type, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        null, // Shannon (human actor)
        "approval_rejected",
        "task",
        id,
        JSON.stringify({
          message: `Shannon rejected task: ${task.title}`,
          reason: reason || "No reason provided",
          status: "blocked",
        }),
        new Date().toISOString(),
      ]
    );

    // Fetch agent info for response
    const agentResult = await pool.query(
      "SELECT name, emoji FROM agents WHERE id = $1",
      [task.assigned_to_agent_id]
    );

    const response = {
      ...task,
      agent_name: agentResult.rows[0]?.name,
      agent_emoji: agentResult.rows[0]?.emoji,
      rejection_reason: reason,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Tasks API] Reject error:", error);
    return NextResponse.json(
      { error: "Failed to reject task" },
      { status: 500 }
    );
  }
}
