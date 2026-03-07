import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

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
    return NextResponse.json(
      { error: "Failed to list actions" },
      { status: 500 }
    );
  }
}
