import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/client";
import {
  getSkill as getGatewaySkill,
  updateSkill as updateGatewaySkill,
  deleteSkill as deleteGatewaySkill,
  isGatewayOnline,
} from "@/lib/openclaw/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  // Try gateway first
  const online = await isGatewayOnline();
  if (online) {
    try {
      const skill = await getGatewaySkill(id);
      if (skill) return NextResponse.json(skill);
    } catch {
      // Fall through to DB
    }
  }

  // Fallback to DB
  if (pool) {
    try {
      const result = await pool.query(`SELECT * FROM skills WHERE id = $1`, [id]);
      if (result.rows.length > 0) {
        return NextResponse.json(rowToSkill(result.rows[0]));
      }
    } catch {
      // DB query failed
    }
  }

  return NextResponse.json({ error: "Skill not found" }, { status: 404 });
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const now = new Date().toISOString();

    // Try gateway first
    const online = await isGatewayOnline();
    if (online) {
      try {
        const skill = await updateGatewaySkill(id, {
          name: body.name,
          description: body.description,
          enabled: body.enabled,
          category: body.category,
          node_ids: body.node_ids,
          config: body.config,
        });

        if (skill) {
          // Sync update to DB
          if (pool) {
            syncUpdateToDb(id, body, now).catch(() => {});
          }
          return NextResponse.json(skill);
        }
      } catch {
        // Fall through to DB-only update
      }
    }

    // Update in local DB
    if (!pool) {
      return NextResponse.json(
        { error: "No database connection and gateway offline" },
        { status: 503 }
      );
    }

    // Build dynamic SET clause
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      sets.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }
    if (body.description !== undefined) {
      sets.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }
    if (body.enabled !== undefined) {
      sets.push(`enabled = $${paramIndex++}`);
      values.push(body.enabled);
    }
    if (body.category !== undefined) {
      sets.push(`category = $${paramIndex++}`);
      values.push(body.category);
    }
    if (body.node_ids !== undefined) {
      sets.push(`node_ids = $${paramIndex++}`);
      values.push(JSON.stringify(body.node_ids));
    }
    if (body.config !== undefined) {
      sets.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(body.config));
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    sets.push(`updated_at = $${paramIndex++}`);
    values.push(now);
    values.push(id);

    const result = await pool.query(
      `UPDATE skills SET ${sets.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    return NextResponse.json(rowToSkill(result.rows[0]));
  } catch (error) {
    console.error("[Skills API] Update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  // Try gateway
  const online = await isGatewayOnline();
  if (online) {
    try {
      await deleteGatewaySkill(id);
    } catch {
      // Continue — still delete from DB
    }
  }

  // Delete from local DB
  if (pool) {
    try {
      await pool.query(`DELETE FROM skills WHERE id = $1`, [id]);
    } catch {
      // DB delete failed
    }
  }

  return NextResponse.json({ ok: true });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToSkill(row: Record<string, unknown>) {
  let nodeIds: string[] = [];
  let config: Record<string, unknown> = {};

  try {
    nodeIds = typeof row.node_ids === "string" ? JSON.parse(row.node_ids) : (row.node_ids as string[]) || [];
  } catch { /* use default */ }

  try {
    config = typeof row.config === "string" ? JSON.parse(row.config) : (row.config as Record<string, unknown>) || {};
  } catch { /* use default */ }

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    enabled: row.enabled ?? true,
    category: row.category || undefined,
    version: row.version || undefined,
    author: row.author || undefined,
    node_ids: nodeIds,
    config,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function syncUpdateToDb(id: string, body: Record<string, unknown>, now: string) {
  if (!pool) return;
  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (body.name !== undefined) { sets.push(`name = $${paramIndex++}`); values.push(body.name); }
  if (body.description !== undefined) { sets.push(`description = $${paramIndex++}`); values.push(body.description); }
  if (body.enabled !== undefined) { sets.push(`enabled = $${paramIndex++}`); values.push(body.enabled); }
  if (body.category !== undefined) { sets.push(`category = $${paramIndex++}`); values.push(body.category); }
  if (body.node_ids !== undefined) { sets.push(`node_ids = $${paramIndex++}`); values.push(JSON.stringify(body.node_ids)); }
  if (body.config !== undefined) { sets.push(`config = $${paramIndex++}`); values.push(JSON.stringify(body.config)); }

  if (sets.length === 0) return;

  sets.push(`updated_at = $${paramIndex++}`);
  values.push(now);
  values.push(id);

  await pool.query(`UPDATE skills SET ${sets.join(", ")} WHERE id = $${paramIndex}`, values);
}
