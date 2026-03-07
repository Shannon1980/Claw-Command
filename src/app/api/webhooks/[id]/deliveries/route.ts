import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: webhookId } = await context.params;

  if (!pool) return NextResponse.json([]);

  try {
    const result = await pool.query(
      `SELECT * FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [webhookId]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Webhook Deliveries API] error:", error);
    return NextResponse.json({ error: "Failed to list deliveries" }, { status: 500 });
  }
}
