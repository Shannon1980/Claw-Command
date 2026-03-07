import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET() {
  if (!pool) return NextResponse.json([]);

  try {
    const result = await pool.query(
      `SELECT * FROM cron_jobs ORDER BY name`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Cron API] GET error:", error);
    return NextResponse.json({ error: "Failed to list cron jobs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { name, schedule, action, enabled } = body;
    const id = `cron-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO cron_jobs (id, name, schedule, action, enabled, run_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 0, $6, $7) RETURNING *`,
      [id, name, schedule, action, enabled ?? true, now, now]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Cron API] POST error:", error);
    return NextResponse.json({ error: "Failed to create cron job" }, { status: 500 });
  }
}
