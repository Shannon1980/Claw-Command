import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) {
    return NextResponse.json({ tasks: [], activities: [] });
  }

  try {
    const { id } = await params;

    const [tasksRes, activitiesRes] = await Promise.all([
      pool.query(
        `SELECT * FROM tasks WHERE assigned_to_agent_id = $1`,
        [id]
      ),
      pool.query(
        `SELECT * FROM activities WHERE actor_agent_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [id]
      ),
    ]);

    return NextResponse.json({
      tasks: tasksRes.rows,
      activities: activitiesRes.rows,
    });
  } catch (error) {
    console.error("[Agent Attribution] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch attribution" },
      { status: 500 }
    );
  }
}
