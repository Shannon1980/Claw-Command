import { NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'lead',
      value_usd NUMERIC DEFAULT 0,
      probability NUMERIC DEFAULT 0,
      owner_agent_id TEXT,
      shannon_approval TEXT,
      created_at TEXT NOT NULL DEFAULT (now()::text),
      updated_at TEXT NOT NULL DEFAULT (now()::text)
    );
  `);
  schemaReady = true;
}

export async function GET() {
  if (!pool) {
    return NextResponse.json([]);
  }

  try {
    await ensureSchema();

    const res = await pool.query(
      `SELECT o.id, o.title, o.stage, o.value_usd, o.probability, o.shannon_approval,
              a.name as owner_name, a.emoji as owner_emoji
       FROM opportunities o
       LEFT JOIN agents a ON o.owner_agent_id = a.id
       ORDER BY o.stage, o.value_usd DESC`
    );

    const opportunities = res.rows.map((r) => ({
      id: r.id,
      title: r.title,
      stage: r.stage,
      valueUsd: Number(r.value_usd) || 0,
      probability: Number(r.probability) || 0,
      ownerAgent: r.owner_name || "Unknown",
      ownerEmoji: r.owner_emoji || "",
      shannonApproval: r.shannon_approval,
    }));

    return NextResponse.json(opportunities);
  } catch (error) {
    console.error("[Opportunities API] Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
