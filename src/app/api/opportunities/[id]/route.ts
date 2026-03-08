import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";


export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.stage !== undefined) {
      updates.push(`stage = $${paramIndex++}`);
      values.push(body.stage);
    }
    if (body.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(body.title);
    }
    if (body.value_usd !== undefined) {
      updates.push(`value_usd = $${paramIndex++}`);
      values.push(body.value_usd);
    }
    if (body.probability !== undefined) {
      updates.push(`probability = $${paramIndex++}`);
      values.push(body.probability);
    }
    if (body.shannon_approval !== undefined) {
      updates.push(`shannon_approval = $${paramIndex++}`);
      values.push(body.shannon_approval);
    }
    if (body.owner_agent_id !== undefined) {
      updates.push(`owner_agent_id = $${paramIndex++}`);
      values.push(body.owner_agent_id);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }
    if (body.solicitation_number !== undefined) {
      updates.push(`solicitation_number = $${paramIndex++}`);
      values.push(body.solicitation_number);
    }
    if (body.set_aside_type !== undefined) {
      updates.push(`set_aside_type = $${paramIndex++}`);
      values.push(body.set_aside_type);
    }
    if (body.naics_codes !== undefined) {
      updates.push(`naics_codes = $${paramIndex++}`);
      values.push(JSON.stringify(body.naics_codes));
    }
    if (body.fit_score !== undefined) {
      updates.push(`fit_score = $${paramIndex++}`);
      values.push(body.fit_score);
    }
    if (body.win_themes !== undefined) {
      updates.push(`win_themes = $${paramIndex++}`);
      values.push(JSON.stringify(body.win_themes));
    }
    if (body.ops_engine_action !== undefined) {
      updates.push(`ops_engine_action = $${paramIndex++}`);
      values.push(body.ops_engine_action);
    }
    if (body.channel !== undefined) {
      updates.push(`channel = $${paramIndex++}`);
      values.push(body.channel);
    }
    if (body.attachments !== undefined) {
      updates.push(`attachments = $${paramIndex++}`);
      values.push(JSON.stringify(body.attachments));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await pool.query(
      `UPDATE opportunities SET ${updates.join(", ")} WHERE id = $${paramIndex}
       RETURNING id, title, stage, value_usd, probability, shannon_approval, owner_agent_id, source, source_url, source_id, agency, deadline`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const row = result.rows[0];
    const agentRes = await pool.query(
      "SELECT name, emoji FROM agents WHERE id = $1",
      [row.owner_agent_id]
    );
    const agent = agentRes.rows[0];

    return NextResponse.json({
      id: row.id,
      title: row.title,
      stage: row.stage,
      valueUsd: Number(row.value_usd) || 0,
      probability: Number(row.probability) || 0,
      ownerAgent: agent?.name || "Unknown",
      ownerEmoji: agent?.emoji || "💼",
      shannonApproval: row.shannon_approval,
      source: row.source || "manual",
      sourceUrl: row.source_url || "",
      sourceId: row.source_id || "",
      agency: row.agency || "",
      deadline: row.deadline || "",
    });
  } catch (error) {
    console.error("[Opportunities API] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update opportunity" },
      { status: 500 }
    );
  }
}
