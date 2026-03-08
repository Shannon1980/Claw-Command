import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { emitTaskUpdate } from "@/lib/events/emitActivity";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const result = await pool.query(
      `SELECT tc.id, tc.task_id, tc.author, tc.content,
              tc.parent_comment_id, tc.created_at,
              a.name as author_name, a.emoji as author_emoji
       FROM task_comments tc
       LEFT JOIN agents a ON tc.author = a.id
       WHERE tc.task_id = $1
       ORDER BY tc.created_at ASC`,
      [taskId]
    );

    // Build threaded structure: top-level comments with nested replies
    const topLevel: Record<string, unknown>[] = [];
    const byId = new Map<string, Record<string, unknown>>();

    for (const row of result.rows) {
      const comment = {
        ...row,
        author_name: row.author_name ?? row.author ?? "Shannon",
        author_emoji: row.author_emoji ?? "👤",
        replies: [] as Record<string, unknown>[],
      };
      byId.set(row.id as string, comment);

      if (!row.parent_comment_id) {
        topLevel.push(comment);
      }
    }

    // Attach replies to parents
    for (const row of result.rows) {
      if (row.parent_comment_id) {
        const parent = byId.get(row.parent_comment_id as string);
        const child = byId.get(row.id as string);
        if (parent && child) {
          (parent.replies as Record<string, unknown>[]).push(child);
        } else {
          // Orphan reply, treat as top-level
          if (child) topLevel.push(child);
        }
      }
    }

    return NextResponse.json(topLevel);
  } catch (error) {
    console.error("[Task Comments] GET error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch data" }, { status: 500 });
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
    const parentCommentId = (body.parent_comment_id as string) || null;
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO task_comments (id, task_id, author, content, parent_comment_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, taskId, author, content, parentCommentId, now]
    );

    // Fetch author agent info
    let authorName: string = author;
    let authorEmoji = "👤";
    if (author !== "shannon") {
      const agentResult = await pool.query(
        "SELECT name, emoji FROM agents WHERE id = $1",
        [author]
      );
      if (agentResult.rows.length > 0) {
        authorName = agentResult.rows[0].name;
        authorEmoji = agentResult.rows[0].emoji;
      }
    }

    const comment = {
      id,
      task_id: taskId,
      author,
      author_name: authorName,
      author_emoji: authorEmoji,
      content,
      parent_comment_id: parentCommentId,
      created_at: now,
    };

    emitTaskUpdate({
      taskId,
      action: "comment_added",
      commentId: id,
      author,
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error("[Task Comments] POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to add comment",
      },
      { status: 500 }
    );
  }
}
