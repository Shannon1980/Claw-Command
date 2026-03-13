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
    const baseUrl = String(gateway.url || "").replace(/\/$/, "");

    let status: "online" | "offline" = "offline";
    let latencyMs = 0;

    const token =
      process.env.OPENCLAW_GATEWAY_TOKEN ||
      process.env.OPENCLAW_TOKEN ||
      process.env.GATEWAY_TOKEN ||
      null;

    // Prefer OpenClaw JSON-RPC ping first
    try {
      const start = Date.now();
      const rpcResp = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ jsonrpc: "2.0", method: "node.list", id: Date.now() }),
        signal: AbortSignal.timeout(10000),
      });
      latencyMs = Date.now() - start;
      if (rpcResp.ok) {
        status = "online";
      }
    } catch {
      status = "offline";
    }

    // Fallback to /health for environments that expose health endpoint only
    if (status === "offline") {
      try {
        const start = Date.now();
        const healthUrl = baseUrl.endsWith("/health") ? baseUrl : `${baseUrl}/health`;
        const response = await fetch(healthUrl, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: AbortSignal.timeout(10000),
        });
        latencyMs = Date.now() - start;
        if (response.ok) {
          status = "online";
        }
      } catch {
        status = "offline";
      }
    }

    const now = new Date().toISOString();
    await pool.query(
      `UPDATE gateways SET status = $1, last_check_at = $2 WHERE id = $3`,
      [status, now, id]
    );

    return NextResponse.json({ status, latencyMs });
  } catch (error) {
    console.error("[Gateway Check API] error:", error);
    return NextResponse.json({ error: "Failed to check gateway" }, { status: 500 });
  }
}
