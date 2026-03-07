import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostCents: 0,
      budgetUsedPct: 0,
      budgetRemainingCents: 0,
    });
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
      `SELECT
         COALESCE(SUM(input_tokens), 0) as total_input,
         COALESCE(SUM(output_tokens), 0) as total_output,
         COALESCE(SUM(cost_cents), 0) as total_cost
       FROM token_usage${whereClause}`,
      values
    );

    const row = result.rows[0];
    const totalInputTokens = parseInt(String(row.total_input), 10);
    const totalOutputTokens = parseInt(String(row.total_output), 10);
    const totalCostCents = parseFloat(String(row.total_cost));

    const budgetMonthlyUsd = parseFloat(
      process.env.TOKEN_BUDGET_MONTHLY_USD || "300"
    );
    const budgetTotalCents = budgetMonthlyUsd * 100;
    const budgetUsedPct =
      budgetTotalCents > 0
        ? Math.round((totalCostCents / budgetTotalCents) * 10000) / 100
        : 0;
    const budgetRemainingCents = Math.max(
      0,
      budgetTotalCents - totalCostCents
    );

    return NextResponse.json({
      totalInputTokens,
      totalOutputTokens,
      totalCostCents,
      budgetUsedPct,
      budgetRemainingCents,
    });
  } catch (error) {
    console.error("[Tokens Summary] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch token summary" },
      { status: 500 }
    );
  }
}
