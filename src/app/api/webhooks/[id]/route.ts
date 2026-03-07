import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitNotification } from "@/lib/events/emitActivity";
import { logAuditEvent } from "@/lib/events/auditLog";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const result = await pool.query(`SELECT * FROM webhooks WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Webhooks API] GET by id error:", error);
    return NextResponse.json({ error: "Failed to get webhook" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const key of ["name", "url", "events", "secret", "enabled"]) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(body[key]);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await pool.query(
      `UPDATE webhooks SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }
    emitNotification({ title: "Webhook updated", type: "info" });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Webhooks API] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 });
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
    // Delete deliveries first (in case no CASCADE FK)
    await pool.query(`DELETE FROM webhook_deliveries WHERE webhook_id = $1`, [id]);
    const result = await pool.query(
      `DELETE FROM webhooks WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }
    emitNotification({ title: "Webhook deleted", type: "info" });
    logAuditEvent({ action: "webhook_deleted", resourceType: "webhook", resourceId: id });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[Webhooks API] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }
}
