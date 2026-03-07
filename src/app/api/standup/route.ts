import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  const date = request.nextUrl.searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const datePrefix = `${date}%`;

  try {
    const [completed, started, blocked, activities] = await Promise.all([
      pool.query(
        `SELECT * FROM tasks WHERE status = 'done' AND updated_at::text LIKE $1 ORDER BY updated_at DESC`,
        [datePrefix]
      ),
      pool.query(
        `SELECT * FROM tasks WHERE status = 'in_progress' AND updated_at::text LIKE $1 ORDER BY updated_at DESC`,
        [datePrefix]
      ),
      pool.query(
        `SELECT * FROM tasks WHERE status = 'blocked' ORDER BY updated_at DESC`
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM activities WHERE created_at::text LIKE $1`,
        [datePrefix]
      ),
    ]);

    return NextResponse.json({
      date,
      completed: completed.rows,
      started: started.rows,
      blocked: blocked.rows,
      activityCount: parseInt(activities.rows[0]?.count || "0", 10),
    });
  } catch (error) {
    console.error("[Standup API] error:", error);
    return NextResponse.json({ error: "Failed to generate standup" }, { status: 500 });
  }
}
