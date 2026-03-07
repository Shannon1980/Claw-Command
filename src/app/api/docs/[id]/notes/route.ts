import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

/**
 * GET /api/docs/[id]/notes — fetch notes for a document
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json([]);
  }

  try {
    const result = await pool.query(
      `SELECT notes FROM docs WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0].notes || []);
  } catch (error) {
    console.error("[Doc Notes API] GET error:", error);
    return NextResponse.json([]);
  }
}

/**
 * POST /api/docs/[id]/notes — add a note to a document
 * Body: { author: string, content: string }
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
    const { author, content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const noteId = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const note = {
      id: noteId,
      author: author || "Shannon",
      content: content.trim(),
      createdAt: now,
    };

    const result = await pool.query(
      `UPDATE docs SET
        notes = COALESCE(notes, '[]'::jsonb) || $1::jsonb,
        version_history = COALESCE(version_history, '[]'::jsonb) || $2::jsonb,
        updated_at = $3
       WHERE id = $4
       RETURNING notes`,
      [
        JSON.stringify([note]),
        JSON.stringify([{ timestamp: now, summary: `note added by ${note.author}` }]),
        now,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      note,
      notes: result.rows[0].notes || [],
    });
  } catch (error) {
    console.error("[Doc Notes API] POST error:", error);
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
