import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/opportunity-engine/push-to-deals
 * Pushes a qualified opportunity from the ops engine into the deals BD pipeline.
 * Body: { opportunityId: string } — ID of the qualified_opportunities row to push.
 */
export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { opportunityId } = body;

    if (!opportunityId) {
      return NextResponse.json(
        { error: "opportunityId is required" },
        { status: 400 }
      );
    }

    // Fetch the qualified opportunity from ops engine table
    const qRes = await pool.query(
      `SELECT * FROM qualified_opportunities WHERE id = $1`,
      [opportunityId]
    );

    if (qRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Opportunity not found in ops engine" },
        { status: 404 }
      );
    }

    const opp = qRes.rows[0];
    const now = new Date().toISOString();

    // Map action to pipeline stage
    const action = opp.action || "WATCH";
    let stage = "identify";
    if (["CAPTURE_NOW", "CAPTURE_NOW_TEAM_SKYWARD", "CAPTURE_NOW_TEAM_VORENTOE"].includes(action)) {
      stage = "qualify";
    }

    // Ensure the opportunities table has the extended columns
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
        ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS solicitation_number TEXT NOT NULL DEFAULT '';
        ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS set_aside_type TEXT NOT NULL DEFAULT '';
        ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS naics_codes TEXT NOT NULL DEFAULT '[]';
        ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS fit_score NUMERIC NOT NULL DEFAULT 0;
        ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS win_themes TEXT NOT NULL DEFAULT '[]';
        ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ops_engine_action TEXT NOT NULL DEFAULT '';
        ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'direct';
        ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS attachments TEXT NOT NULL DEFAULT '[]';
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);

    // Upsert into the deals pipeline
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
        Math.round(Number(opp.amount) * 100), // Convert to cents
        Number(opp.win_probability) || 0,
        "bertha", // Default BD agent
        null,     // Pending Shannon approval
        opp.source || "ops_engine",
        opp.source_url || "",
        opp.id,
        opp.agency || "",
        opp.deadline || "",
        opp.description || "",
        opp.solicitation_number || "",
        opp.set_aside_type || "",
        opp.naics_codes || "[]",
        Number(opp.fit_score) || 0,
        opp.win_themes || "[]",
        opp.action || "",
        opp.channel || "direct",
        "[]",
        now,
        now,
      ]
    );

    return NextResponse.json({
      success: true,
      dealId: opp.id,
      stage,
      message: `Opportunity "${opp.title}" pushed to deals pipeline (${stage} stage)`,
    });
  } catch (error) {
    console.error("[PushToDeals] Error:", error);
    return NextResponse.json(
      { error: "Failed to push opportunity to deals", details: String(error) },
      { status: 500 }
    );
  }
}
