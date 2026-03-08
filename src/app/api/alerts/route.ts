import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { emitAlertFired } from "@/lib/events/emitActivity";

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const searchParams = request.nextUrl.searchParams;
  const severity = searchParams.get("severity");
  const dismissed = searchParams.get("dismissed");

  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (severity) {
      conditions.push(`severity = $${idx++}`);
      values.push(severity);
    }
    if (dismissed === "true") {
      conditions.push(`dismissed_at IS NOT NULL`);
    } else if (dismissed === "false") {
      conditions.push(`dismissed_at IS NULL`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT * FROM alerts ${where} ORDER BY created_at DESC`,
      values
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Alerts API] GET error:", error);
    return NextResponse.json({ error: "Failed to list alerts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { title, severity, triggerType, resourceId, dueDate } = body;
    const id = `alert-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO alerts (id, title, severity, trigger_type, resource_id, due_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, title, severity || "info", triggerType || null, resourceId || null, dueDate || null, now]
    );

    emitAlertFired({
      alertId: id,
      ruleId: "",
      severity: severity || "info",
      title,
    });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Alerts API] POST error:", error);
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}
