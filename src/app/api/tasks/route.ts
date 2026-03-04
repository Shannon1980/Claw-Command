import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dependsOnShannon = searchParams.get("depends_on_shannon");

  try {
    let query = `
      SELECT t.id, t.title, t.assigned_to_agent_id, t.depends_on_shannon, 
             t.status, t.due_date, t.created_at, t.updated_at,
             a.name as agent_name, a.emoji as agent_emoji
      FROM tasks t
      LEFT JOIN agents a ON t.assigned_to_agent_id = a.id
    `;
    
    if (dependsOnShannon === "true") {
      query += " WHERE t.depends_on_shannon = true";
    }
    
    query += " ORDER BY t.due_date ASC NULLS LAST";

    const result = await pool.query(query);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Tasks API] Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
