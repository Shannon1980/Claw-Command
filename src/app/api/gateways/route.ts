import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  try {
    const result = await pool.query(`SELECT * FROM gateways ORDER BY created_at DESC`);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Gateways API] GET error:", error);
    return NextResponse.json({ error: "Failed to list gateways" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { name, url } = body;
    const id = `gw-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO gateways (id, name, url, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'unknown', $4, $5) RETURNING *`,
      [id, name, url, now, now]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Gateways API] POST error:", error);
    return NextResponse.json({ error: "Failed to create gateway" }, { status: 500 });
  }
}
