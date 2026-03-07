import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

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
    };

    for (const [bodyKey, dbCol] of Object.entries(allowedFields)) {
      if (body[bodyKey] !== undefined) {
        fields.push(`${dbCol} = $${idx++}`);
        values.push(body[bodyKey]);
      }
    }

    if (body.linkedTo !== undefined) {
      fields.push(`linked_to = $${idx++}`);
      values.push(JSON.stringify(Array.isArray(body.linkedTo) ? body.linkedTo : []));
      fields.push(`linked_to = $${idx++}::jsonb`);
      values.push(JSON.stringify(body.linkedTo));
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Build version history entry
    const now = new Date().toISOString();
    const changeParts: string[] = [];
    if (body.content !== undefined) changeParts.push("content edited");
    if (body.title !== undefined) changeParts.push("title updated");
    if (body.status !== undefined) changeParts.push(`status → ${body.status}`);
    if (body.linkedTo !== undefined) changeParts.push("links updated");
    const summary = changeParts.length > 0 ? changeParts.join(", ") : "updated";

    fields.push(`version_history = COALESCE(version_history, '[]'::jsonb) || $${idx++}::jsonb`);
    values.push(JSON.stringify([{ timestamp: now, summary }]));

    fields.push(`updated_at = $${idx++}`);
    values.push(now);
    values.push(id);

    const result = await pool.query(
      `UPDATE docs SET ${fields.join(", ")} WHERE id = $${idx} RETURNING
        id, title, doc_type as type, content, status, author_agent_id, linked_to, created_at, updated_at`,
        id, title, doc_type as type, content, status, author_agent_id,
        linked_to, version_history, created_at, updated_at`,
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
