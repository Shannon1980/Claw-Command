import { NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { scanAllSources } from "@/lib/opportunity-engine/scanner";
import type { QualifiedOpportunity } from "@/lib/opportunity-engine/types";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function POST() {
  const samApiKey = process.env.SAM_GOV_API_KEY;

  if (!samApiKey) {
    return NextResponse.json(
      {
        error: "SAM_GOV_API_KEY not configured",
        hint: "Set SAM_GOV_API_KEY environment variable to enable live scanning.",
      },
      { status: 503 }
    );
  }

  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
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
