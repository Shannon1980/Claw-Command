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

/**
 * POST /api/opportunity-engine/scan
 * Scans and ensures opportunity data is available. Use for cron jobs or manual refresh.
 * Returns 503 when database is unavailable.
 */
export async function POST() {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured", scanned: 0 },
      { status: 503 }
    );
  }

  try {
    await ensureSchema();

    const res = await pool.query(
      `SELECT COUNT(*)::int as count FROM opportunities`
    );
    const count = res.rows[0]?.count ?? 0;

    return NextResponse.json({
      ok: true,
      scanned: count,
      message: `Opportunity scan complete: ${count} opportunities in database`,
    });
  } catch (error) {
    console.error("[Opportunity Engine Scan] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Scan failed",
        scanned: 0,
      },
      { status: 503 }
    );
  }
}
