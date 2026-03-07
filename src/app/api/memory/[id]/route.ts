import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitNotification } from "@/lib/events/emitActivity";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const result = await pool.query(`SELECT * FROM mc_memories WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Memory API] GET by id error:", error);
    return NextResponse.json({ error: "Failed to get memory" }, { status: 500 });
  }
}

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

    for (const key of ["content", "source", "tags", "category"]) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        const val = body[key];
        values.push(
          key === "tags" && Array.isArray(val)
            ? JSON.stringify(val)
            : key === "tags" && typeof val === "string"
              ? val
              : val
        );
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await pool.query(
      `UPDATE mc_memories SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }
    const row = result.rows[0] as Record<string, unknown>;
    return NextResponse.json({
      id: row.id,
      content: row.content,
      source: row.source || null,
      category: row.category || null,
      tags: typeof row.tags === "string" ? (() => { try { const p = JSON.parse(row.tags as string); return Array.isArray(p) ? p : []; } catch { return []; } })() : [],
      createdAt: row.updated_at || row.created_at,
    });
  } catch (error) {
    console.error("[Memory API] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update memory" }, { status: 500 });
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
      `DELETE FROM mc_memories WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }
    emitNotification({ title: "Memory deleted", type: "info" });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[Memory API] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 });
  }
}
