import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitPipelineProgress } from "@/lib/events/emitActivity";
import { executePipeline } from "@/lib/pipelines/executor";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
      steps TEXT DEFAULT '[]', status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (now()::text), updated_at TEXT NOT NULL DEFAULT (now()::text)
    );
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id TEXT PRIMARY KEY, pipeline_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'running',
      current_step_index INTEGER DEFAULT 0, started_at TEXT NOT NULL DEFAULT (now()::text),
      completed_at TEXT, results TEXT DEFAULT '{}'
    );
  `);
  schemaReady = true;
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: pipelineId } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    await ensureSchema();
    const pipeCheck = await pool.query(
      `SELECT id, steps FROM pipelines WHERE id = $1 AND status = 'active'`,
      [pipelineId]
    );
    if (pipeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Pipeline not found or not active. Activate the pipeline first." },
        { status: 404 }
      );
    }

    const row = pipeCheck.rows[0];
    let steps = row.steps;
    if (typeof steps === "string") {
      try {
        steps = JSON.parse(steps);
      } catch {
        return NextResponse.json({ error: "Invalid pipeline steps" }, { status: 400 });
      }
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: "Pipeline has no steps" }, { status: 400 });
    }

    const runId = `run-${Date.now()}`;
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO pipeline_runs (id, pipeline_id, status, started_at)
       VALUES ($1, $2, 'running', $3)`,
      [runId, pipelineId, now]
    );

    emitPipelineProgress({ pipelineId, runId, status: "running" });

    // Run executor in background (don't await)
    executePipeline(pipelineId, runId, steps).catch((err) => {
      console.error("[Pipeline Run] Executor error:", err);
    });

    return NextResponse.json(
      { id: runId, pipeline_id: pipelineId, status: "running", started_at: now },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Pipeline Run API] error:", error);
    return NextResponse.json({ error: "Failed to create pipeline run" }, { status: 500 });
  }
}
