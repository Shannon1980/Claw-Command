import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: pipelineId } = await context.params;

  if (!pool) return NextResponse.json([]);

  try {
    const result = await pool.query(
      `SELECT id, pipeline_id, status, current_step_index, started_at, completed_at, results
       FROM pipeline_runs WHERE pipeline_id = $1 ORDER BY started_at DESC`,
      [pipelineId]
    );
    const runs = result.rows.map((r) => ({
      id: r.id,
      pipelineId: r.pipeline_id,
      status: r.status,
      currentStepIndex: r.current_step_index ?? 0,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      results: typeof r.results === "string" ? (() => { try { return JSON.parse(r.results); } catch { return {}; } })() : r.results,
    }));
    return NextResponse.json(runs);
  } catch (error) {
    console.error("[Pipeline Runs API] error:", error);
    return NextResponse.json({ error: "Failed to list pipeline runs" }, { status: 500 });
  }
}
