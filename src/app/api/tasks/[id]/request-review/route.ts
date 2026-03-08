import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { emitTaskUpdate, emitNotification } from "@/lib/events/emitActivity";

export async function POST(
  request: NextRequest,
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

    // Optionally accept a docId to attach as deliverable
    let docId: string | null = null;
    try {
      const body = await request.json();
      docId = body?.docId || null;
    } catch {
      // No body is fine — original behavior
    }

    // If a document was provided, link it to this task
    if (docId) {
      const docResult = await pool.query(
        `SELECT id, linked_to FROM docs WHERE id = $1`,
        [docId]
      );
      if (docResult.rows.length > 0) {
        const existingLinks = docResult.rows[0].linked_to || [];
        const alreadyLinked =
          Array.isArray(existingLinks) &&
          existingLinks.some(
            (link: { type: string; id: string }) =>
              link.type === "task" && link.id === id
          );

        if (!alreadyLinked) {
          // We need the task title — fetch it first
          const titleResult = await pool.query(
            `SELECT title FROM tasks WHERE id = $1`,
            [id]
          );
          const taskTitle = titleResult.rows[0]?.title || id;
          const updatedLinks = [
            ...(Array.isArray(existingLinks) ? existingLinks : []),
            { type: "task", id, name: taskTitle },
          ];

          await pool.query(
            `UPDATE docs SET
              linked_to = $1::jsonb,
              version_history = COALESCE(version_history, '[]'::jsonb) || $2::jsonb,
              updated_at = $3
             WHERE id = $4`,
            [
              JSON.stringify(updatedLinks),
              JSON.stringify([{
                timestamp: now,
                summary: `Linked as deliverable for review`,
              }]),
              now,
              docId,
            ]
          );
        }
      }
    }

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
