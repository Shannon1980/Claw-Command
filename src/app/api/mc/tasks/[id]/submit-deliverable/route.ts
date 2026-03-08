import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { requireMcAuth } from "@/lib/mc/auth";
import { emitTaskUpdate, emitNotification } from "@/lib/events/emitActivity";

/**
 * POST /api/mc/tasks/[id]/submit-deliverable
 *
 * Mission Control–compatible endpoint for agents to submit a document
 * as a task deliverable and optionally request review.
 *
 * Headers:
 *   x-agent-name or x-agent-id: agent identifier
 *   Authorization: Bearer <MC_API_KEY>
 *
 * Body:
 *   { title, content, type?, category?, note?, requestReview? }
 *   or
 *   { docId, note?, requestReview? }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireMcAuth(request);
  if (authError) return authError;

  const { id: taskId } = await context.params;
  const agentId =
    request.headers.get("x-agent-name") ||
    request.headers.get("x-agent-id") ||
    null;

  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const {
      docId,
      title,
      content,
      type: docType,
      category,
      note,
      requestReview,
    } = body;

    // Validate: need either docId or title+content for inline creation
    if (!docId && !title) {
      return NextResponse.json(
        {
          error:
            "Provide docId to link an existing document, or title (+ content) to create one",
        },
        { status: 400 }
      );
    }

    // Verify task exists and belongs to this agent
    const taskResult = await pool.query(
      `SELECT id, title, status, assigned_to_agent_id, depends_on_shannon
       FROM tasks WHERE id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = taskResult.rows[0];

    // Verify agent ownership (if agent header provided)
    if (agentId && task.assigned_to_agent_id && task.assigned_to_agent_id !== agentId) {
      return NextResponse.json(
        { error: "Task is not assigned to this agent" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    let resolvedDocId = docId;

    if (!docId) {
      // Create document inline
      resolvedDocId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      await pool.query(
        `INSERT INTO docs (id, title, doc_type, content, author_agent_id, status,
          linked_to, version_history, priority, review_status, category,
          notes, assignments, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'draft',
          $6::jsonb, $7::jsonb, 'medium', 'pending_review', $8,
          '[]'::jsonb, '[]'::jsonb, $9, $9)`,
        [
          resolvedDocId,
          title,
          docType || "report",
          content || "",
          task.assigned_to_agent_id || agentId,
          JSON.stringify([{ type: "task", id: taskId, name: task.title }]),
          JSON.stringify([
            { timestamp: now, summary: "Created as task deliverable via MC API" },
          ]),
          category || "uncategorized",
          now,
        ]
      );
    } else {
      // Link existing document
      const docResult = await pool.query(
        `SELECT id, linked_to FROM docs WHERE id = $1`,
        [resolvedDocId]
      );

      if (docResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }

      const existingLinks = docResult.rows[0].linked_to || [];
      const alreadyLinked =
        Array.isArray(existingLinks) &&
        existingLinks.some(
          (link: { type: string; id: string }) =>
            link.type === "task" && link.id === taskId
        );

      if (!alreadyLinked) {
        const updatedLinks = [
          ...(Array.isArray(existingLinks) ? existingLinks : []),
          { type: "task", id: taskId, name: task.title },
        ];

        await pool.query(
          `UPDATE docs SET
            linked_to = $1::jsonb,
            version_history = COALESCE(version_history, '[]'::jsonb) || $2::jsonb,
            updated_at = $3
           WHERE id = $4`,
          [
            JSON.stringify(updatedLinks),
            JSON.stringify([
              {
                timestamp: now,
                summary: `Linked as deliverable for task: ${task.title}`,
              },
            ]),
            now,
            resolvedDocId,
          ]
        );
      }
    }

    // Add note as task comment if provided
    if (note) {
      const commentId = `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      await pool
        .query(
          `INSERT INTO task_comments (id, task_id, author, content, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
          [
            commentId,
            taskId,
            task.assigned_to_agent_id || agentId || "agent",
            `[Deliverable submitted] ${note}`,
            now,
          ]
        )
        .catch(() => {
          // table may not exist
        });
    }

    // Record activity
    await pool
      .query(
        `INSERT INTO activities (id, actor_agent_id, event_type, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          task.assigned_to_agent_id || agentId,
          "deliverable_submitted",
          "task",
          taskId,
          JSON.stringify({
            message: `Deliverable submitted for task: ${task.title}`,
            docId: resolvedDocId,
            created: !docId,
            requestReview: !!requestReview,
          }),
          now,
        ]
      )
      .catch(() => {
        // table may not exist
      });

    // Move to review if requested
    let updatedStatus = task.status;
    if (requestReview && task.status !== "review" && task.status !== "done") {
      await pool.query(
        `UPDATE tasks SET status = 'review', updated_at = $1 WHERE id = $2`,
        [now, taskId]
      );
      updatedStatus = "review";

      // Also update the agent's current_task_id if it was this task
      if (task.assigned_to_agent_id) {
        await pool
          .query(
            `UPDATE agents SET current_task_id = NULL WHERE id = $1 AND current_task_id = $2`,
            [task.assigned_to_agent_id, taskId]
          )
          .catch(() => {});
      }
    }

    // Fetch agent info
    let agentName = agentId || "Agent";
    let agentEmoji = "\u{1F916}";
    if (task.assigned_to_agent_id) {
      const agentResult = await pool.query(
        "SELECT name, emoji FROM agents WHERE id = $1",
        [task.assigned_to_agent_id]
      );
      agentName = agentResult.rows[0]?.name ?? agentName;
      agentEmoji = agentResult.rows[0]?.emoji ?? agentEmoji;
    }

    // Emit events
    emitTaskUpdate({
      taskId,
      action: "deliverable_submitted",
      docId: resolvedDocId,
      task: {
        ...task,
        status: updatedStatus,
        agent_name: agentName,
        agent_emoji: agentEmoji,
      },
    });

    if (requestReview) {
      emitNotification({
        title: "Deliverable Ready for Review",
        body: `${agentName} submitted a deliverable for: ${task.title}`,
        type: "review_request",
        taskId,
        docId: resolvedDocId,
      });
    }

    return NextResponse.json({
      ok: true,
      taskId,
      docId: resolvedDocId,
      created: !docId,
      status: updatedStatus,
      requestReview: !!requestReview,
      agent: agentName,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[MC Tasks API] Submit deliverable error:", error);
    return NextResponse.json(
      { error: "Failed to submit deliverable" },
      { status: 500 }
    );
  }
}
