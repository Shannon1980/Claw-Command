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
      description TEXT NOT NULL DEFAULT '',
      solicitation_number TEXT NOT NULL DEFAULT '',
      set_aside_type TEXT NOT NULL DEFAULT '',
      naics_codes TEXT NOT NULL DEFAULT '[]',
      fit_score NUMERIC NOT NULL DEFAULT 0,
      win_themes TEXT NOT NULL DEFAULT '[]',
      ops_engine_action TEXT NOT NULL DEFAULT '',
      channel TEXT NOT NULL DEFAULT 'direct',
      attachments TEXT NOT NULL DEFAULT '[]',
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
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS solicitation_number TEXT NOT NULL DEFAULT '';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS set_aside_type TEXT NOT NULL DEFAULT '';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS naics_codes TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS fit_score NUMERIC NOT NULL DEFAULT 0;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS win_themes TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ops_engine_action TEXT NOT NULL DEFAULT '';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'direct';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS attachments TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS passed_at TEXT;
    EXCEPTION WHEN others THEN NULL;
    END $$;
  `);
  schemaReady = true;
}

export async function GET() {
  if (!pool) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    await ensureSchema();

    const res = await pool.query(
      `SELECT o.id, o.title, o.stage, o.value_usd, o.probability, o.shannon_approval,
              o.source, o.source_url, o.source_id, o.agency, o.deadline,
              o.description, o.solicitation_number, o.set_aside_type,
              o.naics_codes, o.fit_score, o.win_themes,
              o.ops_engine_action, o.channel, o.attachments,
              a.name as owner_name, a.emoji as owner_emoji
       FROM opportunities o
       LEFT JOIN agents a ON o.owner_agent_id = a.id
       WHERE o.passed_at IS NULL
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
      description: r.description || "",
      solicitationNumber: r.solicitation_number || "",
      setAsideType: r.set_aside_type || "",
      naicsCodes: JSON.parse(r.naics_codes || "[]"),
      fitScore: Number(r.fit_score) || 0,
      winThemes: JSON.parse(r.win_themes || "[]"),
      opsEngineAction: r.ops_engine_action || "",
      channel: r.channel || "direct",
      attachments: JSON.parse(r.attachments || "[]"),
    }));

    return NextResponse.json(opportunities);
  } catch (error) {
    console.error("[Opportunities API] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch data" }, { status: 500 });
  }
}
