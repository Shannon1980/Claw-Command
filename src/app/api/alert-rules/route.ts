import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET() {
  if (!pool) return NextResponse.json([]);

  try {
    const result = await pool.query(`SELECT * FROM alert_rules ORDER BY name`);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Alert Rules API] GET error:", error);
    return NextResponse.json({ error: "Failed to list alert rules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { name, condition, channels, enabled } = body;
    const id = `arule-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO alert_rules (id, name, condition, channels, enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, name, condition, channels, enabled ?? true, now, now]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Alert Rules API] POST error:", error);
    return NextResponse.json({ error: "Failed to create alert rule" }, { status: 500 });
  }
}
