import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(_request: NextRequest) {
  if (!pool) {
    return NextResponse.json([]);
  }

  try {
    const result = await pool.query(
      `SELECT model,
              COALESCE(SUM(input_tokens), 0) as input_tokens,
              COALESCE(SUM(output_tokens), 0) as output_tokens,
              COALESCE(SUM(cost_cents), 0) as cost_cents
       FROM token_usage
       GROUP BY model
       ORDER BY SUM(cost_cents) DESC`
    );

    const rows = result.rows.map((row: Record<string, unknown>) => ({
      model: row.model,
      inputTokens: parseInt(String(row.input_tokens), 10),
      outputTokens: parseInt(String(row.output_tokens), 10),
      costCents: parseFloat(String(row.cost_cents)),
    }));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[Tokens By Model] Error:", error);
    return NextResponse.json([]);
  }
}
