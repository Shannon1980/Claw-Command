import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Update task: set status to in_progress, clear depends_on_shannon flag
    const taskResult = await pool.query(
      `UPDATE tasks 
       SET status = 'in_progress', 
           depends_on_shannon = false, 
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

    // Log activity event
    await pool.query(
      `INSERT INTO activities (id, actor_agent_id, event_type, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        null, // Shannon (human actor)
        "approval_given",
        "task",
        id,
        JSON.stringify({
          message: `Shannon approved task: ${task.title}`,
          old_status: "blocked",
          new_status: "in_progress",
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
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Tasks API] Approve error:", error);
    return NextResponse.json(
      { error: "Failed to approve task" },
      { status: 500 }
    );
  }
}
