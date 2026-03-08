import { pool } from "@/lib/db/client";
import { NextResponse } from "next/server";


let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'backlog',
      description TEXT DEFAULT '',
      dependencies TEXT DEFAULT '[]',
      owner_agent_id TEXT,
      shannon_approval TEXT,
      created_at TEXT NOT NULL DEFAULT (now()::text),
      updated_at TEXT NOT NULL DEFAULT (now()::text)
    );
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
      `SELECT a.id, a.title, a.stage, a.description, a.dependencies, a.shannon_approval,
              ag.name as owner_name, ag.emoji as owner_emoji
       FROM applications a
       LEFT JOIN agents ag ON a.owner_agent_id = ag.id
       ORDER BY a.stage, a.title`
    );

    const applications = res.rows.map((r) => {
      let deps: unknown[] = [];
      try {
        deps = typeof r.dependencies === "string" ? JSON.parse(r.dependencies || "[]") : r.dependencies || [];
      } catch {
        /* ignore */
      }
      return {
        id: r.id,
        title: r.title,
        stage: r.stage,
        description: r.description || "",
        ownerAgent: r.owner_name || "Unknown",
        ownerEmoji: r.owner_emoji || "",
        dependenciesCount: Array.isArray(deps) ? deps.length : 0,
        shannonApproval: r.shannon_approval,
      };
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("[Applications API] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch data" }, { status: 500 });
  }
}
