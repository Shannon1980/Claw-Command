import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dependsOnShannon = searchParams.get("depends_on_shannon");
  const agent = searchParams.get("agent");
  const all = searchParams.get("all") === "true";

  try {
    let query = `
      SELECT t.id, t.title, t.assigned_to_agent_id, t.depends_on_shannon, 
             t.status, t.due_date, t.created_at, t.updated_at,
             a.name as agent_name, a.emoji as agent_emoji, a.domain as agent_domain
      FROM tasks t
      LEFT JOIN agents a ON t.assigned_to_agent_id = a.id
    `;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dependsOnShannon === "true" && !all) {
      conditions.push("t.depends_on_shannon = true");
    }
    if (agent) {
      conditions.push(`t.assigned_to_agent_id = $${paramIndex++}`);
      values.push(agent);
    }
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY t.due_date ASC NULLS LAST, t.updated_at DESC";

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Tasks API] Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
