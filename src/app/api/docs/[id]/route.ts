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

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await pool.query(
      `UPDATE docs SET ${fields.join(", ")} WHERE id = $${idx} RETURNING
        id, title, doc_type as type, content, status, author_agent_id, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
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
