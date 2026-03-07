import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ items: [], nextCursor: null });
  }

  const searchParams = request.nextUrl.searchParams;
  const agent = searchParams.get("agent");
  const type = searchParams.get("type");
  const resource = searchParams.get("resource");
  const since = searchParams.get("since");
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    let query = `
      SELECT
        a.id, a.actor_agent_id, a.event_type, a.resource_type,
        a.resource_id, a.details, a.created_at,
        ag.name as actor_name, ag.emoji as actor_emoji
      FROM activities a
      LEFT JOIN agents ag ON a.actor_agent_id = ag.id
    `;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (cursor) {
      conditions.push(`a.id < $${paramIndex++}`);
      values.push(cursor);
    }

    if (agent) {
      conditions.push(`a.actor_agent_id = $${paramIndex++}`);
      values.push(agent);
    }

    if (type) {
      conditions.push(`a.event_type = $${paramIndex++}`);
      values.push(type);
    }

    if (resource) {
      conditions.push(`a.resource_type = $${paramIndex++}`);
      values.push(resource);
    }

    if (since) {
      conditions.push(`a.created_at >= $${paramIndex++}`);
      values.push(since);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex++}`;
    values.push(limit);

    const result = await pool.query(query, values);

    // Transform rows
    const items = result.rows.map((row: Record<string, unknown>) => {
      let description =
        (row.event_type as string)?.replace(/_/g, " ") ?? "";
      try {
        const d = JSON.parse((row.details as string) || "{}");
        if (d?.message) description = d.message;
      } catch {
        /* ignore */
      }
      return {
        id: row.id,
        agent_name: row.actor_name || "System",
        agent_emoji: row.actor_emoji || "⚙️",
        event_type: row.event_type,
        resource_type: row.resource_type,
        resource_id: row.resource_id,
        description,
        timestamp: row.created_at,
        metadata: {},
      };
    });

    const lastId =
      items.length === limit
        ? (items[items.length - 1].id as string)
        : null;

    return NextResponse.json({ items, nextCursor: lastId });
  } catch (error) {
    console.error("[Activities API] Error:", error);
    return NextResponse.json({ items: [], nextCursor: null }, { status: 500 });
  }
}
