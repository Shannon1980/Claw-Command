import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  if (fromDate) {
    conditions.push(`created_at::timestamp::date >= $${paramIndex++}::date`);
    values.push(fromDate);
  }
  if (toDate) {
    conditions.push(`created_at::timestamp::date <= $${paramIndex++}::date`);
    values.push(toDate);
  }
  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `SELECT model,
              COALESCE(SUM(input_tokens), 0) as input_tokens,
              COALESCE(SUM(output_tokens), 0) as output_tokens,
              COALESCE(SUM(cost_cents), 0) as cost_cents
       FROM token_usage${whereClause}
       GROUP BY model
       ORDER BY SUM(cost_cents) DESC`,
      values
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
