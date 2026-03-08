import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

function verifyCronAuth(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return null; // no secret configured — allow
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

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
export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
  return refreshHeartbeats();
}

/** POST - manual trigger */
export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
  return refreshHeartbeats();
}
