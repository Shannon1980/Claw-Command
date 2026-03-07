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
      `SELECT tu.agent_id,
              COALESCE(a.name, 'Unknown') as agent_name,
              COALESCE(a.emoji, '👤') as agent_emoji,
              COALESCE(SUM(tu.input_tokens), 0) as input_tokens,
              COALESCE(SUM(tu.output_tokens), 0) as output_tokens,
              COALESCE(SUM(tu.cost_cents), 0) as cost_cents
       FROM token_usage tu
       LEFT JOIN agents a ON tu.agent_id = a.id
       GROUP BY tu.agent_id, a.name, a.emoji
       ORDER BY SUM(tu.cost_cents) DESC`
    );

    const rows = result.rows.map((row: Record<string, unknown>) => ({
      agentId: row.agent_id,
      agentName: row.agent_name,
      agentEmoji: row.agent_emoji,
      inputTokens: parseInt(String(row.input_tokens), 10),
      outputTokens: parseInt(String(row.output_tokens), 10),
      costCents: parseFloat(String(row.cost_cents)),
    }));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[Tokens By Agent] Error:", error);
    return NextResponse.json([]);
  }
}
