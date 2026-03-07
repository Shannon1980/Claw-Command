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
      `SELECT * FROM pipeline_runs WHERE pipeline_id = $1 ORDER BY started_at DESC`,
      [pipelineId]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Pipeline Runs API] error:", error);
    return NextResponse.json({ error: "Failed to list pipeline runs" }, { status: 500 });
  }
}
