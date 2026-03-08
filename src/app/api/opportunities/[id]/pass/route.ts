import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

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
      `UPDATE opportunities SET passed_at = $1, updated_at = $1 WHERE id = $2 RETURNING id`,
      [now, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id, passedAt: now });
  } catch (error) {
    console.error("[Opportunities Pass API] error:", error);
    return NextResponse.json({ error: "Failed to pass opportunity" }, { status: 500 });
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
      `UPDATE opportunities SET passed_at = NULL, updated_at = $1 WHERE id = $2 RETURNING id`,
      [new Date().toISOString(), id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("[Opportunities Unpass API] error:", error);
    return NextResponse.json({ error: "Failed to restore opportunity" }, { status: 500 });
  }
}
