import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function POST(_request: NextRequest) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  try {
    const result = await pool.query(
      `UPDATE notifications SET read_at = NOW()::text WHERE read_at IS NULL`
    );

    return NextResponse.json({
      ok: true,
      updated: result.rowCount,
    });
  } catch (error) {
    console.error("[Notifications Read All] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark all as read" },
      { status: 500 }
    );
  }
}
