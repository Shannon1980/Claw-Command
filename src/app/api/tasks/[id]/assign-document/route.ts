import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { emitTaskUpdate, emitNotification } from "@/lib/events/emitActivity";

const AssignDocumentSchema = z.object({
  // Either link an existing document…
  docId: z.string().optional(),
  // …or create a new document inline
  createDoc: z
    .object({
      title: z.string().min(1),
      content: z.string().default(""),
      type: z.string().default("report"),
      category: z.string().default("uncategorized"),
    })
    .optional(),
  // Optionally move task to review when attaching
  requestReview: z.boolean().default(false),
  // Note from the agent about the deliverable
  note: z.string().optional(),
});

/**
 * POST /api/tasks/[id]/assign-document
 *
 * Allows an agent to assign a document as a deliverable for a task.
 * Supports two modes:
 *   1. Link an existing document by docId
 *   2. Create a new document inline and link it
 *
 * Optionally moves the task to "review" status when requestReview is true.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await context.params;

  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = AssignDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { docId, createDoc, requestReview, note } = parsed.data;

    if (!docId && !createDoc) {
      return NextResponse.json(
        { error: "Provide either docId (existing document) or createDoc (new document)" },
        { status: 400 }
      );
    }

    // 1. Verify the task exists
    const taskResult = await pool.query(
      `SELECT id, title, status, assigned_to_agent_id, depends_on_shannon
       FROM tasks WHERE id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = taskResult.rows[0];
    const now = new Date().toISOString();
    let resolvedDocId = docId;

    // 2. If creating a new document, insert it
    if (createDoc) {
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
          createDoc.title,
          createDoc.type,
          createDoc.content,
          task.assigned_to_agent_id,
          JSON.stringify([{ type: "task", id: taskId, name: task.title }]),
          JSON.stringify([{ timestamp: now, summary: "Created as task deliverable" }]),
          createDoc.category,
          now,
        ]
      );
    } else {
      // 3. Link the existing document to this task
      // First verify the document exists
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

      // Append this task to the document's linked_to array (if not already linked)
      const existingLinks = docResult.rows[0].linked_to || [];
      const alreadyLinked = Array.isArray(existingLinks) &&
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
            JSON.stringify([{
              timestamp: now,
              summary: `Linked as deliverable for task: ${task.title}`,
            }]),
            now,
            resolvedDocId,
          ]
        );
      }
    }

    // 4. Optionally add a comment/note about the deliverable
    if (note) {
      const commentId = `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      await pool.query(
        `INSERT INTO task_comments (id, task_id, author, content, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          commentId,
          taskId,
          task.assigned_to_agent_id || "system",
          `[Deliverable attached] ${note}`,
          now,
        ]
      ).catch(() => {
        // task_comments table may not exist
      });
    }

    // 5. Record activity
    await pool.query(
      `INSERT INTO activities (id, actor_agent_id, event_type, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        task.assigned_to_agent_id,
        "document_assigned",
        "task",
        taskId,
        JSON.stringify({
          message: `Document assigned to task: ${task.title}`,
          docId: resolvedDocId,
          created: !!createDoc,
        }),
        now,
      ]
    ).catch(() => {
      // activities table may not exist
    });

    // 6. Move task to review if requested
    let updatedStatus = task.status;
    if (requestReview && task.status !== "review" && task.status !== "done") {
      await pool.query(
        `UPDATE tasks SET status = 'review', updated_at = $1 WHERE id = $2`,
        [now, taskId]
      );
      updatedStatus = "review";
    }

    // 7. Fetch agent info
    let agentName = "Shannon";
    let agentEmoji = "\u{1F464}";
    if (task.assigned_to_agent_id) {
      const agentResult = await pool.query(
        "SELECT name, emoji FROM agents WHERE id = $1",
        [task.assigned_to_agent_id]
      );
      agentName = agentResult.rows[0]?.name ?? agentName;
      agentEmoji = agentResult.rows[0]?.emoji ?? agentEmoji;
    }

    // 8. Emit events
    emitTaskUpdate({
      taskId,
      action: "document_assigned",
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
        body: `${agentName} attached a document to: ${task.title}`,
        type: "review_request",
        taskId,
        docId: resolvedDocId,
      });
    }

    return NextResponse.json({
      ok: true,
      taskId,
      docId: resolvedDocId,
      created: !!createDoc,
      status: updatedStatus,
      agent_name: agentName,
      agent_emoji: agentEmoji,
    });
  } catch (error) {
    console.error("[Tasks API] Assign document error:", error);
    return NextResponse.json(
      { error: "Failed to assign document to task" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tasks/[id]/assign-document
 *
 * Returns all documents linked to a specific task.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await context.params;

  if (!pool) {
    return NextResponse.json([]);
  }

  try {
    // Find docs whose linked_to array contains this task ID
    const result = await pool.query(
      `SELECT d.id, d.title, d.doc_type as type, d.content, d.status,
              d.author_agent_id, d.review_status, d.updated_at
       FROM docs d
       WHERE d.linked_to::text LIKE $1
       ORDER BY d.updated_at DESC`,
      [`%${taskId}%`]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Tasks API] Get task documents error:", error);
    return NextResponse.json([]);
  }
}
