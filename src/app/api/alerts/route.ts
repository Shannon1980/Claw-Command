import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { getActiveAlerts, mockAlerts } from "@/lib/mock-alerts";

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get("active") === "true";

  try {
    if (pool && connectionString) {
      const query = activeOnly
        ? `SELECT id, title, severity, trigger_type, resource_id, due_date, dismissed_at, created_at
           FROM alerts WHERE dismissed_at IS NULL ORDER BY 
           CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
           due_date ASC NULLS LAST`
        : `SELECT id, title, severity, trigger_type, resource_id, due_date, dismissed_at, created_at
           FROM alerts ORDER BY created_at DESC`;
      const result = await pool.query(query);
      if (result.rows.length > 0) {
        const alerts = result.rows.map((row) => ({
          id: row.id,
          severity: row.severity,
          title: row.title,
          trigger_type: row.trigger_type,
          due_date: row.due_date ?? "",
          created_at: row.created_at,
          dismissed_at: row.dismissed_at,
          description: undefined,
        }));
        return NextResponse.json(alerts);
      }
    }
  } catch (error) {
    console.error("[Alerts API] Error:", error);
  }

  // Fallback to mock when DB is unavailable or empty
  if (activeOnly) {
    return NextResponse.json(getActiveAlerts());
  }
  return NextResponse.json(mockAlerts);
}
