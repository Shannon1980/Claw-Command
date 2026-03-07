import { pool } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { scanAllSources } from "@/lib/opportunity-engine/scanner";
import type { QualifiedOpportunity } from "@/lib/opportunity-engine/types";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

let schemaReady = false;

function ensureSchema(): Promise<void> {
  if (schemaReady || !pool) return Promise.resolve();
  const sql =
    "CREATE TABLE IF NOT EXISTS qualified_opportunities (" +
    "id TEXT PRIMARY KEY, title TEXT NOT NULL, agency TEXT NOT NULL DEFAULT '', " +
    "amount NUMERIC DEFAULT 0, deadline TEXT, days_until_close INTEGER DEFAULT 0, " +
    "naics_codes TEXT NOT NULL DEFAULT '[]', set_aside_type TEXT NOT NULL DEFAULT '', " +
    "source TEXT NOT NULL DEFAULT 'sam_gov', source_url TEXT NOT NULL DEFAULT '', " +
    "solicitation_number TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', " +
    "fit_score NUMERIC NOT NULL DEFAULT 0, win_probability INTEGER NOT NULL DEFAULT 0, " +
    "action TEXT NOT NULL DEFAULT 'PASS', channel TEXT NOT NULL DEFAULT 'direct', " +
    "fit_breakdown TEXT NOT NULL DEFAULT '{}', win_breakdown TEXT NOT NULL DEFAULT '{}', " +
    "win_themes TEXT NOT NULL DEFAULT '[]', dedupe_hash TEXT NOT NULL UNIQUE, " +
    "scanned_at TEXT NOT NULL, qualified_at TEXT NOT NULL)";
  return pool.query(sql).then(() => {
    schemaReady = true;
  });
}

// GET for Vercel cron, POST for manual triggers
export async function GET() {
  return runScan();
}

export async function POST() {
  return runScan();
}

async function runScan() {
  const samApiKey = process.env.SAM_GOV_API_KEY;

  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured", hint: "Set DATABASE_URL in Vercel environment variables." },
      { status: 503 }
    );
  }

  // When SAM API key is missing, return count of existing opportunities (no 503)
  if (!samApiKey) {
    try {
      await ensureSchema();
      const res = await pool.query("SELECT COUNT(*)::int as count FROM qualified_opportunities");
      const count = res.rows[0]?.count ?? 0;
      return NextResponse.json({
        success: true,
        scanned: count,
        message: "SAM_GOV_API_KEY not set. Returning existing opportunity count. Set SAM_GOV_API_KEY to enable live SAM.gov scanning.",
        totalInserted: 0,
        scannedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[OpportunityEngine] Count error:", err);
      return NextResponse.json(
        { error: "Database error", details: String(err) },
        { status: 503 }
      );
    }
  }

  try {
    await ensureSchema();
    // Get existing hashes for deduplication
    const hashRes = await pool.query(
      "SELECT dedupe_hash FROM qualified_opportunities"
    );
    const existingHashes = new Set(
      hashRes.rows.map((r: { dedupe_hash: string }) => r.dedupe_hash)
    );

    // Run scan
    const results = await scanAllSources(samApiKey, existingHashes);

    // Upsert new opportunities
    let inserted = 0;
    for (const result of results) {
      for (const opp of result.opportunities) {
        await upsertOpportunity(opp);
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      results: results.map((r) => ({
        source: r.source,
        totalFound: r.totalFound,
        qualifiedCount: r.qualifiedCount,
        duplicatesSkipped: r.duplicatesSkipped,
      })),
      totalInserted: inserted,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[OpportunityEngine] Scan error:", error);
    return NextResponse.json(
      { error: "Scan failed", details: String(error) },
      { status: 500 }
    );
  }
}

async function upsertOpportunity(opp: QualifiedOpportunity) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO qualified_opportunities (
      id, title, agency, amount, deadline, days_until_close,
      naics_codes, set_aside_type, source, source_url,
      solicitation_number, description, fit_score, win_probability,
      action, channel, fit_breakdown, win_breakdown, win_themes,
      dedupe_hash, scanned_at, qualified_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19,
      $20, $21, $22
    ) ON CONFLICT (dedupe_hash) DO UPDATE SET
      days_until_close = EXCLUDED.days_until_close,
      fit_score = EXCLUDED.fit_score,
      win_probability = EXCLUDED.win_probability,
      action = EXCLUDED.action,
      scanned_at = EXCLUDED.scanned_at`,
    [
      opp.id,
      opp.title,
      opp.agency,
      opp.amount,
      opp.deadline,
      opp.daysUntilClose,
      JSON.stringify(opp.naicsCodes),
      opp.setAsideType,
      opp.source,
      opp.sourceUrl,
      opp.solicitationNumber,
      opp.description,
      opp.fitScore,
      opp.winProbability,
      opp.action,
      opp.channel,
      JSON.stringify(opp.fitBreakdown),
      JSON.stringify(opp.winBreakdown),
      JSON.stringify(opp.winThemes),
      opp.dedupeHash,
      opp.scannedAt,
      opp.qualifiedAt,
    ]
  );
}
