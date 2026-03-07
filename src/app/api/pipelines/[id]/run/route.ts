import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitPipelineProgress } from "@/lib/events/emitActivity";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: pipelineId } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    // Verify pipeline exists
    const pipeCheck = await pool.query(`SELECT id FROM pipelines WHERE id = $1`, [pipelineId]);
    if (pipeCheck.rows.length === 0) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    const runId = `run-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO pipeline_runs (id, pipeline_id, status, started_at)
       VALUES ($1, $2, 'running', $3) RETURNING *`,
      [runId, pipelineId, now]
    );

    emitPipelineProgress({
      pipelineId,
      runId,
      status: "running",
    });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Pipeline Run API] error:", error);
    return NextResponse.json({ error: "Failed to create pipeline run" }, { status: 500 });
  }
}
