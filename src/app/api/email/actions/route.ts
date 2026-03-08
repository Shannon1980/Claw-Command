import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

    const res = await pool.query(
      `SELECT id, account_id, rule_id, message_id, action, status, details, created_at
       FROM email_actions
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return NextResponse.json(res.rows);
  } catch (err) {
    console.error("[Email API] List actions error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to fetch data" }, { status: 500 });
  }
}
