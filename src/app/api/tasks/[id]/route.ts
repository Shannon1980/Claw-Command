import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.assigned_to_agent_id, t.depends_on_shannon, 
              t.status, t.due_date, t.created_at, t.updated_at,
              a.name as agent_name, a.emoji as agent_emoji
       FROM tasks t
       LEFT JOIN agents a ON t.assigned_to_agent_id = a.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Tasks API] Get task error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query based on provided fields
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(body.status);
    }
    if (body.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(body.title);
    }
    if (body.due_date !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(body.due_date);
    }
    if (body.depends_on_shannon !== undefined) {
      updates.push(`depends_on_shannon = $${paramIndex++}`);
      values.push(body.depends_on_shannon);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Always update updated_at
    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());

    // Add id as final parameter
    values.push(id);

    const result = await pool.query(
      `UPDATE tasks 
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING 
         id, title, assigned_to_agent_id, depends_on_shannon, 
         status, due_date, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Fetch agent info for response
    const task = result.rows[0];
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
    console.error("[Tasks API] Update task error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}
