import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const result = await pool.query(`SELECT * FROM alerts WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Alerts API] GET by id error:", error);
    return NextResponse.json({ error: "Failed to get alert" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const result = await pool.query(
      `DELETE FROM alerts WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[Alerts API] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete alert" }, { status: 500 });
  }
}
