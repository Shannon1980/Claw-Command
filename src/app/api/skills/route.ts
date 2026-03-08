import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/client";
import {
  listSkills as listGatewaySkills,
  createSkill as createGatewaySkill,
  isGatewayOnline,
} from "@/lib/openclaw/client";

export async function GET() {
  // Try gateway first — if online, sync results to DB
  const online = await isGatewayOnline();

  if (online) {
    try {
      const gatewaySkills = await listGatewaySkills();
      // Sync gateway skills to local DB in background
      if (pool && gatewaySkills.length > 0) {
        syncSkillsToDb(gatewaySkills).catch(() => {});
      }
      return NextResponse.json(gatewaySkills);
    } catch {
      // Gateway call failed — fall through to DB
    }
  }

  // Fallback: serve from local DB
  if (pool) {
    try {
      const result = await pool.query(
        `SELECT id, name, description, enabled, category, version, author, node_ids, config, created_at, updated_at
         FROM skills ORDER BY created_at DESC`
      );
      const skills = result.rows.map(rowToSkill);
      return NextResponse.json(skills);
    } catch (err) {
      console.error("[Skills API] DB query failed:", err);
    }
  }

  // No gateway and no DB — return empty with a header indicating offline
  return NextResponse.json([], {
    headers: { "X-Gateway-Status": "offline" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = (body.name as string)?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const id = `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nodeIds = body.node_ids || [];
    const config = body.config || {};

    // Try gateway first
    const online = await isGatewayOnline();
    if (online) {
      try {
        const skill = await createGatewaySkill({
          name,
          description: body.description || undefined,
          enabled: body.enabled ?? true,
          category: body.category || undefined,
          node_ids: nodeIds.length > 0 ? nodeIds : undefined,
          config: Object.keys(config).length > 0 ? config : undefined,
        });

        if (skill) {
          // Also save to local DB
          if (pool) {
            saveSkillToDb(skill).catch(() => {});
          }
          return NextResponse.json(skill, { status: 201 });
        }
      } catch {
        // Gateway create failed — fall through to DB-only
      }
    }

    // Save to local DB
    if (!pool) {
      return NextResponse.json(
        { error: "No database connection and gateway offline" },
        { status: 503 }
      );
    }

    const skill = {
      id,
      name,
      description: body.description || null,
      enabled: body.enabled ?? true,
      category: body.category || null,
      version: null,
      author: null,
      node_ids: nodeIds,
      config,
      created_at: now,
      updated_at: now,
    };

    await pool.query(
      `INSERT INTO skills (id, name, description, enabled, category, version, author, node_ids, config, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        skill.id,
        skill.name,
        skill.description,
        skill.enabled,
        skill.category,
        skill.version,
        skill.author,
        JSON.stringify(skill.node_ids),
        JSON.stringify(skill.config),
        skill.created_at,
        skill.updated_at,
      ]
    );

    return NextResponse.json(skill, { status: 201 });
  } catch (error) {
    console.error("[Skills API] Create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 500 }
    );
  }
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

async function saveSkillToDb(skill: Record<string, unknown>) {
  if (!pool) return;
  const nodeIds = JSON.stringify(skill.node_ids || []);
  const config = JSON.stringify(skill.config || {});
  const now = new Date().toISOString();

  await pool.query(
    `INSERT INTO skills (id, name, description, enabled, category, version, author, node_ids, config, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       enabled = EXCLUDED.enabled,
       category = EXCLUDED.category,
       version = EXCLUDED.version,
       author = EXCLUDED.author,
       node_ids = EXCLUDED.node_ids,
       config = EXCLUDED.config,
       updated_at = EXCLUDED.updated_at`,
    [
      skill.id,
      skill.name,
      skill.description || null,
      skill.enabled ?? true,
      skill.category || null,
      skill.version || null,
      skill.author || null,
      nodeIds,
      config,
      skill.created_at || now,
      skill.updated_at || now,
    ]
  );
}

async function syncSkillsToDb(skills: Record<string, unknown>[]) {
  for (const skill of skills) {
    await saveSkillToDb(skill);
  }
}
