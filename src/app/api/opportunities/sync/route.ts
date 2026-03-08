import { pool } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { scanAllSources } from "@/lib/opportunity-engine/scanner";
import type { QualifiedOpportunity } from "@/lib/opportunity-engine/types";

export async function POST() {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    // Ensure source columns exist
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

    // Get existing opportunity IDs to avoid duplicates
    const existingRes = await pool.query(
      "SELECT source_id FROM opportunities WHERE source_id != ''"
    );
    const existingSourceIds = new Set(
      existingRes.rows.map((r: { source_id: string }) => r.source_id)
    );

    // Scan all sources (SAM.gov, Montgomery County MD, EMMA)
    const samApiKey = process.env.SAM_GOV_API_KEY || null;
    const existingHashes = new Set<string>();

    const results = await scanAllSources(samApiKey, existingHashes);

    let inserted = 0;
    let skipped = 0;

    for (const result of results) {
      for (const opp of result.opportunities) {
        // Skip if we already have this source ID
        if (existingSourceIds.has(opp.id)) {
          skipped++;
          continue;
        }

        await upsertDealOpportunity(opp);
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      sources: results.map((r) => ({
        source: r.source,
        totalFound: r.totalFound,
        qualifiedCount: r.qualifiedCount,
        duplicatesSkipped: r.duplicatesSkipped,
      })),
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Opportunities Sync] Error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}

async function upsertDealOpportunity(opp: QualifiedOpportunity) {
  if (!pool) return;

  const now = new Date().toISOString();

  // Map opportunity engine action to pipeline stage
  const stage = mapActionToStage(opp.action);

  await pool.query(
    `INSERT INTO opportunities (
      id, title, stage, value_usd, probability,
      owner_agent_id, shannon_approval,
      source, source_url, source_id, agency, deadline,
      description, solicitation_number, set_aside_type,
      naics_codes, fit_score, win_themes,
      ops_engine_action, channel, attachments,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7,
      $8, $9, $10, $11, $12,
      $13, $14, $15,
      $16, $17, $18,
      $19, $20, $21,
      $22, $23
    ) ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      value_usd = EXCLUDED.value_usd,
      probability = EXCLUDED.probability,
      source_url = EXCLUDED.source_url,
      deadline = EXCLUDED.deadline,
      description = EXCLUDED.description,
      solicitation_number = EXCLUDED.solicitation_number,
      set_aside_type = EXCLUDED.set_aside_type,
      naics_codes = EXCLUDED.naics_codes,
      fit_score = EXCLUDED.fit_score,
      win_themes = EXCLUDED.win_themes,
      ops_engine_action = EXCLUDED.ops_engine_action,
      channel = EXCLUDED.channel,
      updated_at = EXCLUDED.updated_at`,
    [
      opp.id,
      opp.title,
      stage,
      Math.round(opp.amount * 100), // Convert to cents
      opp.winProbability,
      "bertha", // Default BD agent
      null, // Pending Shannon approval
      opp.source,
      opp.sourceUrl,
      opp.id,
      opp.agency,
      opp.deadline,
      opp.description,
      opp.solicitationNumber,
      opp.setAsideType,
      JSON.stringify(opp.naicsCodes),
      opp.fitScore,
      JSON.stringify(opp.winThemes),
      opp.action,
      opp.channel,
      "[]", // No attachments from scan
      now,
      now,
    ]
  );
}

function mapActionToStage(action: string): string {
  switch (action) {
    case "CAPTURE_NOW":
    case "CAPTURE_NOW_TEAM_SKYWARD":
    case "CAPTURE_NOW_TEAM_VORENTOE":
      return "qualify";
    case "WATCH":
      return "identify";
    case "PASS":
    default:
      return "identify";
  }
}
