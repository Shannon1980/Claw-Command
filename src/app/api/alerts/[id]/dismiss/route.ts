import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { dismissAlert } from "@/lib/mock-alerts";

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: alertId } = await context.params;

  try {
    if (pool && connectionString) {
      const result = await pool.query(
        `UPDATE alerts SET dismissed_at = $1 WHERE id = $2 AND dismissed_at IS NULL RETURNING id`,
        [new Date().toISOString(), alertId]
      );
      if (result.rowCount && result.rowCount > 0) {
        return NextResponse.json({
          success: true,
          message: "Alert dismissed successfully",
        });
      }
    }
  } catch (error) {
    console.error("[Alerts Dismiss] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to dismiss alert" },
      { status: 500 }
    );
  }

  // Fallback to mock when DB unavailable
  const success = dismissAlert(alertId);
  if (success) {
    return NextResponse.json({
      success: true,
      message: "Alert dismissed successfully",
    });
  }

  return NextResponse.json(
    { success: false, message: "Alert not found" },
    { status: 404 }
  );
}
