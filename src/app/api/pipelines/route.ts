import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      steps TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (now()::text),
      updated_at TEXT NOT NULL DEFAULT (now()::text)
    );
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id TEXT PRIMARY KEY,
      pipeline_id TEXT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'running',
      current_step_index INTEGER DEFAULT 0,
      started_at TEXT NOT NULL DEFAULT (now()::text),
      completed_at TEXT,
      results TEXT DEFAULT '{}'
    );
  `);
  schemaReady = true;
}

export async function GET() {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  try {
    await ensureSchema();
    const result = await pool.query(
      `SELECT * FROM pipelines ORDER BY updated_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Pipelines API] GET error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    await ensureSchema();
    const body = await request.json();
    const { name, description, steps } = body;
    const id = `pipe-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO pipelines (id, name, description, steps, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6) RETURNING *`,
      [id, name, description || "", typeof steps === "string" ? steps : JSON.stringify(steps), now, now]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Pipelines API] POST error:", error);
    return NextResponse.json({ error: "Failed to create pipeline" }, { status: 500 });
  }
}
