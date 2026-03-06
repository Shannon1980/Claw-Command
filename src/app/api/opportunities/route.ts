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
      `SELECT o.id, o.title, o.stage, o.value_usd, o.probability, o.shannon_approval,
              a.name as owner_name, a.emoji as owner_emoji
       FROM opportunities o
       LEFT JOIN agents a ON o.owner_agent_id = a.id
       ORDER BY o.stage, o.value_usd DESC`
    );

    const opportunities = res.rows.map((r) => ({
      id: r.id,
      title: r.title,
      stage: r.stage,
      valueUsd: Number(r.value_usd) || 0,
      probability: Number(r.probability) || 0,
      ownerAgent: r.owner_name || "Unknown",
      ownerEmoji: r.owner_emoji || "💼",
      shannonApproval: r.shannon_approval,
    }));

    return NextResponse.json(opportunities);
  } catch (error) {
    console.error("[Opportunities API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}
