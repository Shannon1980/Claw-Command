import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const agent = searchParams.get("agent");
  const level = searchParams.get("level");
  const since = searchParams.get("since");
  const limit = parseInt(searchParams.get("limit") || "200", 10);

  try {
    let query = `
      SELECT l.id, l.agent_id, l.session_id, l.level, l.message, l.metadata, l.created_at,
             a.name as agent_name, a.emoji as agent_emoji
      FROM agent_logs l
      LEFT JOIN agents a ON l.agent_id = a.id
    `;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (agent) {
      conditions.push(`l.agent_id = $${paramIndex++}`);
      values.push(agent);
    }

    if (level) {
      conditions.push(`l.level = $${paramIndex++}`);
      values.push(level);
    }

    if (since) {
      conditions.push(`l.created_at >= $${paramIndex++}`);
      values.push(since);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += ` ORDER BY l.created_at DESC LIMIT $${paramIndex++}`;
    values.push(limit);

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Logs API] Error:", error);
    return NextResponse.json([]);
  }
}
