import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { pushTaskToOpenClaw } from "@/lib/openclaw/client";

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

    const row = result.rows[0];
    return NextResponse.json({
      ...row,
      agent_name: row.agent_name ?? "Shannon",
      agent_emoji: row.agent_emoji ?? "👤",
    });
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
    if (body.assigned_to_agent_id !== undefined) {
      updates.push(`assigned_to_agent_id = $${paramIndex++}`);
      const raw = body.assigned_to_agent_id;
      const assignedToMe =
        raw == null ||
        raw === "" ||
        String(raw).toLowerCase() === "shannon";
      values.push(assignedToMe ? null : raw);
      values.push(body.assigned_to_agent_id);
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

    const task = result.rows[0];
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

    // Push to OpenClaw when assigned to an agent (not to me)
    if (
      body.assigned_to_agent_id !== undefined &&
      task.assigned_to_agent_id
    ) {
      const pushResult = await pushTaskToOpenClaw({
        taskId: id,
        title: task.title,
        agentId: task.assigned_to_agent_id,
        status: task.status,
        dueDate: task.due_date,
      });
      if (!pushResult.ok) {
        console.warn("[Tasks API] OpenClaw push failed:", pushResult.error);
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Tasks API] Update task error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const isNullConstraint =
      /null value in column|violates not-null constraint/i.test(message);
    return NextResponse.json(
      {
        error: "Failed to update task",
        details: message,
        ...(isNullConstraint && {
          hint: "Run migration: ALTER TABLE tasks ALTER COLUMN assigned_to_agent_id DROP NOT NULL;",
        }),
      },
      { status: 500 }
    );
  }
}
