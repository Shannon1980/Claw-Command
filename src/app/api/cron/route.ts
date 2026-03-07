import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { emitNotification } from "@/lib/events/emitActivity";
import { computeNextRun } from "@/lib/cron/next-run";

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cron_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      action TEXT DEFAULT '{}',
      enabled BOOLEAN DEFAULT true,
      last_run_at TEXT,
      next_run_at TEXT,
      run_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (now()::text),
      updated_at TEXT NOT NULL DEFAULT (now()::text)
    );
    ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS action TEXT;
    ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS next_run_at TEXT;
    CREATE TABLE IF NOT EXISTS cron_runs (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      result TEXT,
      error TEXT,
      started_at TEXT NOT NULL DEFAULT (now()::text),
      completed_at TEXT,
      duration_ms INTEGER
    );
  `);
  schemaReady = true;
}

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
    await ensureSchema();
    const result = await pool.query(
      `SELECT * FROM cron_jobs ORDER BY name`
    );
    return NextResponse.json(result.rows.map(mapRow));
  } catch (error) {
    console.error("[Cron API] GET error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    await ensureSchema();
    const body = await request.json();
    const { name, schedule, action, enabled } = body;
    const id = `cron-${Date.now()}`;
    const now = new Date().toISOString();

    const actionVal = typeof action === "object" ? JSON.stringify(action ?? {}) : (action ?? "{}");
    const nextRun = (enabled ?? true) ? computeNextRun(schedule, new Date()) : null;
    const nextRunIso = nextRun ? nextRun.toISOString() : null;

    const result = await pool.query(
      `INSERT INTO cron_jobs (id, name, schedule, action, enabled, run_count, next_run_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8) RETURNING *`,
      [id, name, schedule, actionVal, enabled ?? true, nextRunIso, now, now]
    );

    emitNotification({ title: `Cron job "${name}" created`, type: "info" });
    return NextResponse.json(mapRow(result.rows[0]), { status: 201 });
  } catch (error) {
    console.error("[Cron API] POST error:", error);
    return NextResponse.json({ error: "Failed to create cron job" }, { status: 500 });
  }
}
