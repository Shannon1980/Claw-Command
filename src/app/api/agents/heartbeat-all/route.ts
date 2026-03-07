import { NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

/**
 * POST /api/agents/heartbeat-all
 * Bulk-update all non-retired agents' updated_at to now.
 * Can be called by a cron job or the UI to keep heartbeats fresh.
 */
export async function POST() {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const now = new Date().toISOString();
    const result = await pool.query(
      `UPDATE agents SET updated_at = $1 WHERE retired_at IS NULL RETURNING id, name, status`,
      [now]
    );

    return NextResponse.json({
      ok: true,
      updated: result.rowCount,
      agents: result.rows.map((r) => r.id),
      timestamp: now,
    });
  } catch (error) {
    console.error("[Heartbeat All] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Heartbeat failed" },
      { status: 500 }
    );
  }
}
