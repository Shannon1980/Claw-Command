import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pushTaskToOpenClaw } from "@/lib/openclaw/client";
import { emitTaskUpdate } from "@/lib/events/emitActivity";

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z
    .enum([
      "inbox",
      "backlog",
      "in_progress",
      "review",
      "quality_review",
      "blocked",
      "done",
    ])
    .optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  assigned_to_agent_id: z.string().nullable().optional(),
  depends_on_shannon: z.boolean().optional(),
  due_date: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  ticket_ref: z.string().nullable().optional(),
  parent_opportunity_id: z.string().nullable().optional(),
  parent_application_id: z.string().nullable().optional(),
  outcome: z.string().nullable().optional(),
});

export async function GET(
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
    const result = await pool.query(
      `SELECT t.id, t.title, t.description, t.assigned_to_agent_id, t.depends_on_shannon,
              t.status, t.priority, t.due_date, t.outcome, t.project, t.ticket_ref,
              t.parent_opportunity_id, t.parent_application_id,
              t.created_at, t.updated_at,
              a.name as agent_name, a.emoji as agent_emoji, a.domain as agent_domain,
              (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id) as comment_count
       FROM tasks t
       LEFT JOIN agents a ON t.assigned_to_agent_id = a.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      ...row,
      comment_count: parseInt(row.comment_count, 10),
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

  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured. Set DATABASE_URL." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = UpdateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, unknown> = {
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      depends_on_shannon: data.depends_on_shannon,
      due_date: data.due_date,
      project: data.project,
      ticket_ref: data.ticket_ref,
      parent_opportunity_id: data.parent_opportunity_id,
      parent_application_id: data.parent_application_id,
      outcome: data.outcome,
    };

    for (const [col, val] of Object.entries(fieldMap)) {
      if (val !== undefined) {
        updates.push(`${col} = $${paramIndex++}`);
        values.push(val);
      }
    }

    // Handle assigned_to_agent_id specially (shannon normalization)
    if (data.assigned_to_agent_id !== undefined) {
      const raw = data.assigned_to_agent_id;
      const assignedToMe =
        raw == null || raw === "" || String(raw).toLowerCase() === "shannon";
      updates.push(`assigned_to_agent_id = $${paramIndex++}`);
      values.push(assignedToMe ? null : raw);
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
         id, title, description, assigned_to_agent_id, depends_on_shannon,
         status, priority, due_date, outcome, project, ticket_ref,
         parent_opportunity_id, parent_application_id,
         created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
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

    // Push to OpenClaw when assigned to an agent
    if (
      data.assigned_to_agent_id !== undefined &&
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

    emitTaskUpdate({ taskId: id, action: "updated", task: response });

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

export async function DELETE(
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
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING id, title",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    emitTaskUpdate({
      taskId: id,
      action: "deleted",
      title: result.rows[0].title,
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[Tasks API] Delete task error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
