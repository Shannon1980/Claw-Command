import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET() {
  if (!pool) return NextResponse.json([]);

  try {
    const result = await pool.query(
      `SELECT * FROM pipelines ORDER BY updated_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Pipelines API] GET error:", error);
    return NextResponse.json({ error: "Failed to list pipelines" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { name, description, steps } = body;
    const id = `pipe-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO pipelines (id, name, description, steps, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6) RETURNING *`,
      [id, name, description || "", steps, now, now]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Pipelines API] POST error:", error);
    return NextResponse.json({ error: "Failed to create pipeline" }, { status: 500 });
  }
}
