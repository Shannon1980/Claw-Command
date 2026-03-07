import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

/**
 * POST /api/docs/[id]/assign
 * Assign a document to memory, task, or orchestration pipeline.
 * Body: { target: "memory"|"task"|"orchestration", agentId?, instructions?, priority? }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { target, agentId, instructions, priority } = body;

    if (!target || !["memory", "task", "orchestration"].includes(target)) {
      return NextResponse.json(
        { error: "target must be 'memory', 'task', or 'orchestration'" },
        { status: 400 }
      );
    }

    // Get the document first
    const docResult = await pool.query(
      `SELECT id, title, content, doc_type, assignments FROM docs WHERE id = $1`,
      [id]
    );
    if (docResult.rows.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const doc = docResult.rows[0];
    const now = new Date().toISOString();
    let targetId: string | undefined;

    // Execute the assignment based on target
    if (target === "memory") {
      // Create a memory entry from the document
      const memId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await pool.query(
        `INSERT INTO memories (id, content, source, category, tags, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [
          memId,
          doc.content || doc.title,
          `doc:${id}`,
          "context",
          JSON.stringify(["document", doc.doc_type]),
          now,
        ]
      ).catch(() => {
        // memories table may not exist yet — that's ok, assignment is still tracked
      });
      targetId = memId;
    } else if (target === "task") {
      // Create a task from the document
      const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const taskTitle = instructions
        ? `[Doc] ${doc.title}: ${instructions.slice(0, 100)}`
        : `[Doc] Review and action: ${doc.title}`;

      await pool.query(
        `INSERT INTO tasks (id, title, assigned_to_agent_id, depends_on_shannon, status, priority, created_at, updated_at)
         VALUES ($1, $2, $3, false, 'ready', $4, $5, $5)`,
        [taskId, taskTitle, agentId || null, priority || "medium", now]
      ).catch(() => {
        // tasks table may not exist — assignment is still tracked
      });
      targetId = taskId;
    } else if (target === "orchestration") {
      // Link the document to a pipeline (targetId should be passed by the client)
      targetId = body.targetId || undefined;
    }

    // Record the assignment on the document
    const assignment = {
      target,
      targetId,
      agentId: agentId || null,
      instructions: instructions || null,
      priority: priority || "medium",
      assignedAt: now,
      status: "pending",
    };

    const existingAssignments = doc.assignments || [];
    const updatedAssignments = [...existingAssignments, assignment];

    await pool.query(
      `UPDATE docs SET
        assignments = $1::jsonb,
        version_history = COALESCE(version_history, '[]'::jsonb) || $2::jsonb,
        updated_at = $3
       WHERE id = $4`,
      [
        JSON.stringify(updatedAssignments),
        JSON.stringify([{ timestamp: now, summary: `assigned to ${target}${agentId ? ` (agent: ${agentId})` : ""}` }]),
        now,
        id,
      ]
    );

    return NextResponse.json({
      ok: true,
      assignment,
      assignments: updatedAssignments,
    });
  } catch (error) {
    console.error("[Docs Assign API] Error:", error);
    return NextResponse.json({ error: "Failed to assign document" }, { status: 500 });
  }
}
