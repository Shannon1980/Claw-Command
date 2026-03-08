import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { emitNotification } from "@/lib/events/emitActivity";
import { logAuditEvent } from "@/lib/events/auditLog";

export async function GET() {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  try {
    const result = await pool.query(`SELECT * FROM webhooks ORDER BY created_at DESC`);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Webhooks API] GET error:", error);
    return NextResponse.json({ error: "Failed to list webhooks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { name, url, events, secret, enabled } = body;
    const id = `wh-${Date.now()}`;
    const finalSecret = secret || crypto.randomUUID();
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO webhooks (id, name, url, events, secret, enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, name, url, events, finalSecret, enabled ?? true, now, now]
    );

    emitNotification({ title: "Webhook created", type: "info" });
    logAuditEvent({ action: "webhook_created", resourceType: "webhook", resourceId: id });
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Webhooks API] POST error:", error);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}
