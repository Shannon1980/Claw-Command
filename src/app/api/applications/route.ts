import { NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

export async function GET() {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
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
        ownerEmoji: r.owner_emoji || "📱",
        dependenciesCount: Array.isArray(deps) ? deps.length : 0,
        shannonApproval: r.shannon_approval,
      };
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("[Applications API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
