import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Activities API] Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
