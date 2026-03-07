import { pool } from "@/lib/db/client";
import { NextResponse } from "next/server";

async function refreshHeartbeats() {
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

/** GET - Vercel cron calls GET */
export async function GET() {
  return refreshHeartbeats();
}

/** POST - manual trigger */
export async function POST() {
  return refreshHeartbeats();
}
