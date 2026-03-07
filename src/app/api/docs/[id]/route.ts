import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const allowedFields: Record<string, string> = {
      title: "title",
      content: "content",
      status: "status",
      type: "doc_type",
      docType: "doc_type",
      priority: "priority",
      reviewStatus: "review_status",
      category: "category",
    };

    for (const [bodyKey, dbCol] of Object.entries(allowedFields)) {
      if (body[bodyKey] !== undefined) {
        fields.push(`${dbCol} = $${idx++}`);
        values.push(body[bodyKey]);
      }
    }

    if (body.linkedTo !== undefined) {
      fields.push(`linked_to = $${idx++}::jsonb`);
      values.push(JSON.stringify(body.linkedTo));
    }

    if (body.assignments !== undefined) {
      fields.push(`assignments = $${idx++}::jsonb`);
      values.push(JSON.stringify(body.assignments));
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Build version history entry
    const now = new Date().toISOString();
    const changeParts: string[] = [];
    if (body.content !== undefined) changeParts.push("content edited");
    if (body.title !== undefined) changeParts.push("title updated");
    if (body.status !== undefined) changeParts.push(`status -> ${body.status}`);
    if (body.linkedTo !== undefined) changeParts.push("links updated");
    if (body.priority !== undefined) changeParts.push(`priority -> ${body.priority}`);
    if (body.reviewStatus !== undefined) changeParts.push(`review -> ${body.reviewStatus}`);
    if (body.category !== undefined) changeParts.push(`category -> ${body.category}`);
    if (body.assignments !== undefined) changeParts.push("assignments updated");
    const summary = changeParts.length > 0 ? changeParts.join(", ") : "updated";

    fields.push(`version_history = COALESCE(version_history, '[]'::jsonb) || $${idx++}::jsonb`);
    values.push(JSON.stringify([{ timestamp: now, summary }]));

    fields.push(`updated_at = $${idx++}`);
    values.push(now);
    values.push(id);

    const result = await pool.query(
      `UPDATE docs SET ${fields.join(", ")} WHERE id = $${idx} RETURNING
        id, title, doc_type as type, content, status, author_agent_id,
        linked_to, version_history, priority, review_status, category,
        notes, assignments, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      ...row,
      linkedTo: row.linked_to || [],
      versionHistory: row.version_history || [],
      reviewStatus: row.review_status || "pending_review",
      notes: row.notes || [],
      assignments: row.assignments || [],
    });
  } catch (error) {
    console.error("[Docs API] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const result = await pool.query(
      `DELETE FROM docs WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[Docs API] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
