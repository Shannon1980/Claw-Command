import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS token_usage (
      id TEXT PRIMARY KEY, agent_id TEXT, session_id TEXT, model TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
      cost_cents NUMERIC NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
  `);
  schemaReady = true;
}

export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  let whereClause: string;
  const values: unknown[] = [];
  if (fromDate && toDate) {
    whereClause = "WHERE created_at::timestamp::date >= $1::date AND created_at::timestamp::date <= $2::date";
    values.push(fromDate, toDate);
  } else {
    whereClause = "WHERE created_at::timestamp >= (NOW() - INTERVAL '1 day' * $1)::timestamp";
    values.push(days);
  }

  try {
    await ensureSchema();
    const result = await pool.query(
      `SELECT created_at::timestamp::date as date,
              COALESCE(SUM(input_tokens), 0) as input_tokens,
              COALESCE(SUM(output_tokens), 0) as output_tokens,
              COALESCE(SUM(cost_cents), 0) as cost_cents
       FROM token_usage
       ${whereClause}
       GROUP BY created_at::timestamp::date
       ORDER BY created_at::timestamp::date ASC`,
      values
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
