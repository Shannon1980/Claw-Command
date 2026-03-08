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

export async function GET(_request: NextRequest) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    await ensureSchema();
    const result = await pool.query(
      `SELECT tu.session_id,
              MIN(tu.created_at) as started_at,
              SUM(tu.input_tokens) as total_input,
              SUM(tu.output_tokens) as total_output,
              SUM(tu.cost_cents) as total_cost,
              COUNT(*) as message_count,
              MIN(a.name) as agent_name,
              MIN(a.emoji) as agent_emoji
       FROM token_usage tu
       LEFT JOIN agents a ON tu.agent_id = a.id
       WHERE tu.session_id IS NOT NULL
       GROUP BY tu.session_id
       ORDER BY MIN(tu.created_at) DESC
       LIMIT 50`
    );

    const rows = result.rows.map((row: Record<string, unknown>) => ({
      session_id: row.session_id,
      started_at: row.started_at,
      total_input: parseInt(String(row.total_input || "0"), 10),
      total_output: parseInt(String(row.total_output || "0"), 10),
      total_cost: parseFloat(String(row.total_cost || "0")),
      message_count: parseInt(String(row.message_count || "0"), 10),
      agent_name: row.agent_name ?? "Unknown",
      agent_emoji: row.agent_emoji ?? "👤",
    }));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[Sessions API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
