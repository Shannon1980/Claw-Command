import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

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
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }
    if (body.shannon_approval !== undefined) {
      updates.push(`shannon_approval = $${paramIndex++}`);
      values.push(body.shannon_approval);
    }
    if (body.owner_agent_id !== undefined) {
      updates.push(`owner_agent_id = $${paramIndex++}`);
      values.push(body.owner_agent_id);
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
      `UPDATE applications SET ${updates.join(", ")} WHERE id = $${paramIndex}
       RETURNING id, title, stage, description, dependencies, shannon_approval, owner_agent_id`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const row = result.rows[0];
    const agentRes = await pool.query(
      "SELECT name, emoji FROM agents WHERE id = $1",
      [row.owner_agent_id]
    );
    const agent = agentRes.rows[0];
    let deps: unknown[] = [];
    try {
      deps = typeof row.dependencies === "string" ? JSON.parse(row.dependencies || "[]") : row.dependencies || [];
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      id: row.id,
      title: row.title,
      stage: row.stage,
      description: row.description || "",
      ownerAgent: agent?.name || "Unknown",
      ownerEmoji: agent?.emoji || "📱",
      dependenciesCount: Array.isArray(deps) ? deps.length : 0,
      shannonApproval: row.shannon_approval,
    });
  } catch (error) {
    console.error("[Applications API] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}
