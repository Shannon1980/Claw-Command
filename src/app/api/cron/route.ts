import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitNotification } from "@/lib/events/emitActivity";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

function mapRow(row: Record<string, unknown>) {
  const action = row.action ?? row.command;
  return {
    id: row.id,
    name: row.name,
    schedule: row.schedule,
    action: typeof action === "string" ? (() => { try { return JSON.parse(action); } catch { return {}; } })() : action ?? {},
    enabled: row.enabled ?? true,
    lastRun: row.last_run_at ?? null,
    nextRun: row.next_run_at ?? null,
    runCount: Number(row.run_count) ?? 0,
    createdAt: row.created_at,
  };
}

export async function GET() {
  if (!pool) return NextResponse.json([]);

  try {
    const result = await pool.query(
      `SELECT * FROM cron_jobs ORDER BY name`
    );
    return NextResponse.json(result.rows.map(mapRow));
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

    const actionVal = typeof action === "object" ? JSON.stringify(action ?? {}) : (action ?? "{}");
    let inserted: Record<string, unknown>;

    try {
      const result = await pool.query(
        `INSERT INTO cron_jobs (id, name, schedule, action, enabled, run_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, $6, $7) RETURNING *`,
        [id, name, schedule, actionVal, enabled ?? true, now, now]
      );
      inserted = result.rows[0];
    } catch {
      const result = await pool.query(
        `INSERT INTO cron_jobs (id, name, schedule, command, enabled, run_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, $6, $7) RETURNING *`,
        [id, name, schedule, actionVal, enabled ?? true, now, now]
      );
      inserted = result.rows[0];
    }

    emitNotification({ title: `Cron job "${name}" created`, type: "info" });
    return NextResponse.json(mapRow(inserted), { status: 201 });
  } catch (error) {
    console.error("[Cron API] POST error:", error);
    return NextResponse.json({ error: "Failed to create cron job" }, { status: 500 });
  }
}
