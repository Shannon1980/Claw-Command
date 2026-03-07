import { pool } from "@/lib/db/client";
import { NextResponse } from "next/server";


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
      source TEXT NOT NULL DEFAULT 'manual',
      source_url TEXT NOT NULL DEFAULT '',
      source_id TEXT NOT NULL DEFAULT '',
      agency TEXT NOT NULL DEFAULT '',
      deadline TEXT,
      created_at TEXT NOT NULL DEFAULT (now()::text),
      updated_at TEXT NOT NULL DEFAULT (now()::text)
    );
  `);
  // Add columns if table already existed without them
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT '';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS agency TEXT NOT NULL DEFAULT '';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS deadline TEXT;
    EXCEPTION WHEN others THEN NULL;
    END $$;
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
              o.source, o.source_url, o.source_id, o.agency, o.deadline,
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
      source: r.source || "manual",
      sourceUrl: r.source_url || "",
      sourceId: r.source_id || "",
      agency: r.agency || "",
      deadline: r.deadline || "",
    }));

    return NextResponse.json(opportunities);
  } catch (error) {
    console.error("[Opportunities API] Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
