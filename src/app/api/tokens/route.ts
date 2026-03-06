import { NextResponse } from "next/server";
import { fetchTokenMetrics } from "@/lib/openclaw/metrics";

/**
 * GET /api/tokens
 * Fetches token usage from OpenClaw Prometheus metrics (openclaw@3.7.2+).
 * Requires metrics enabled in gateway.config.mjs: metrics: { enabled: true, port: 9464 }
 */
export async function GET() {
  const metrics = await fetchTokenMetrics();
  return NextResponse.json(metrics);
}
