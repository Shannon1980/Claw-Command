import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

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

export async function GET(_request: NextRequest) {
  if (!pool) {
    return NextResponse.json([]);
  }

  try {
    await ensureSchema();
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
