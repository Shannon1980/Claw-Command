import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const now = new Date().toISOString();
    const result = await pool.query(
      `UPDATE alerts SET dismissed_at = $1 WHERE id = $2 RETURNING *`,
      [now, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Alerts Dismiss API] error:", error);
    return NextResponse.json({ error: "Failed to dismiss alert" }, { status: 500 });
  }
}
