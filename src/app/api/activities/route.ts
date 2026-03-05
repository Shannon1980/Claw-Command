import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const result = await pool.query(
      `SELECT 
        a.id, a.actor_agent_id, a.event_type, a.resource_type, 
        a.resource_id, a.details, a.created_at,
        ag.name as actor_name, ag.emoji as actor_emoji
       FROM activities a
       LEFT JOIN agents ag ON a.actor_agent_id = ag.id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );

    // Transform for ActivityFeed: agent_name, agent_emoji, description, timestamp
    const rows = result.rows.map((row: Record<string, unknown>) => {
      let description = (row.event_type as string)?.replace(/_/g, " ") ?? "";
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
        description,
        timestamp: row.created_at,
        metadata: {},
      };
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[Activities API] Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
