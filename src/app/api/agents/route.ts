import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT id, name, emoji, domain, status, current_task_id, updated_at FROM agents ORDER BY domain, name"
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Agents API] Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
