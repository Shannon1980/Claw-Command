import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

function mapRow(row: Record<string, unknown>) {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata as Record<string, unknown>) ?? {};
  } catch {
    metadata = {};
  }
  return {
    id: row.id,
    agentId: row.agent_id ?? null,
    agentName: row.agent_name ?? undefined,
    agentEmoji: row.agent_emoji ?? undefined,
    sessionId: row.session_id ?? null,
    level: row.level ?? "info",
    message: row.message ?? "",
    metadata,
    createdAt: row.created_at,
  };
}

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
    return NextResponse.json(result.rows.map(mapRow));
  } catch (error) {
    console.error("[Logs API] Error:", error);
    return NextResponse.json([]);
  }
}
