import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  try {
    const result = await pool.query(
      `SELECT DATE(created_at) as date,
              COALESCE(SUM(input_tokens), 0) as input_tokens,
              COALESCE(SUM(output_tokens), 0) as output_tokens,
              COALESCE(SUM(cost_cents), 0) as cost_cents
       FROM token_usage
       WHERE created_at::timestamptz >= NOW() - INTERVAL '1 day' * $1
       GROUP BY DATE(created_at::timestamptz)
       ORDER BY DATE(created_at::timestamptz) ASC`,
      [days]
    );

    const rows = result.rows.map((row: Record<string, unknown>) => ({
      date: row.date,
      inputTokens: parseInt(String(row.input_tokens), 10),
      outputTokens: parseInt(String(row.output_tokens), 10),
      costCents: parseFloat(String(row.cost_cents)),
    }));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[Tokens Daily] Error:", error);
    return NextResponse.json([]);
  }
}
