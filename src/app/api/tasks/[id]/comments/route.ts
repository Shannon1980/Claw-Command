import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await context.params;

  if (!pool) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const result = await pool.query(
      `SELECT id, task_id, author, content, created_at
       FROM task_comments
       WHERE task_id = $1
       ORDER BY created_at ASC`,
      [taskId]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Task Comments] GET error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

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
    const content = (body.content as string)?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    const id = `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const author = (body.author as string) || "shannon";
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO task_comments (id, task_id, author, content, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, taskId, author, content, now]
    );

    return NextResponse.json({
      id,
      task_id: taskId,
      author,
      content,
      created_at: now,
    });
  } catch (error) {
    console.error("[Task Comments] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add comment" },
      { status: 500 }
    );
  }
}
