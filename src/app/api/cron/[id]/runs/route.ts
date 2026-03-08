import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  try {
    const result = await pool.query(
      `SELECT id, job_id, status, result, error, started_at, completed_at, duration_ms
       FROM cron_runs WHERE job_id = $1 ORDER BY started_at DESC LIMIT 20`,
      [id]
    );
    return NextResponse.json(result.rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      jobId: r.job_id,
      status: r.status,
      result: r.result,
      error: r.error,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      durationMs: r.duration_ms,
    })));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch data" }, { status: 500 });
  }
}
