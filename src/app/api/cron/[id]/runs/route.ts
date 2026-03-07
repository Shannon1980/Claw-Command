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
  const { id } = await context.params;

  if (!pool) return NextResponse.json([]);

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
  } catch {
    return NextResponse.json([]);
  }
}
