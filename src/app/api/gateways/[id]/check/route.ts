import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const gwResult = await pool.query(`SELECT * FROM gateways WHERE id = $1`, [id]);
    if (gwResult.rows.length === 0) {
      return NextResponse.json({ error: "Gateway not found" }, { status: 404 });
    }

    const gateway = gwResult.rows[0];
    const checkUrl = gateway.url.endsWith("/health")
      ? gateway.url
      : `${gateway.url}/health`;

    let status: "online" | "offline" = "offline";
    let latencyMs = 0;

    try {
      const start = Date.now();
      const response = await fetch(checkUrl, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });
      latencyMs = Date.now() - start;
      if (response.ok) {
        status = "online";
      }
    } catch {
      status = "offline";
    }

    const now = new Date().toISOString();
    await pool.query(
      `UPDATE gateways SET status = $1, last_check_at = $2, updated_at = $3 WHERE id = $4`,
      [status, now, now, id]
    );

    return NextResponse.json({ status, latencyMs });
  } catch (error) {
    console.error("[Gateway Check API] error:", error);
    return NextResponse.json({ error: "Failed to check gateway" }, { status: 500 });
  }
}
