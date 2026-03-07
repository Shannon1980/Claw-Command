import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import crypto from "crypto";
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
    const result = await pool.query(
      `SELECT id, username, role, email, created_at, updated_at FROM users WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Users API] GET by id error:", error);
    return NextResponse.json({ error: "Failed to get user" }, { status: 500 });
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

    for (const key of ["username", "role", "email"]) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(body[key]);
      }
    }

    if (body.password) {
      const hash = crypto.createHash("sha256").update(body.password).digest("hex");
      fields.push(`password_hash = $${idx++}`);
      values.push(hash);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx}
       RETURNING id, username, role, email, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    emitNotification({ title: "User updated", type: "info" });
    logAuditEvent({ action: "user_updated", resourceType: "user", resourceId: id });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Users API] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
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
    // Delete user sessions first
    await pool.query(`DELETE FROM sessions_auth WHERE user_id = $1`, [id]);
    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    emitNotification({ title: "User deleted", type: "info" });
    logAuditEvent({ action: "user_deleted", resourceType: "user", resourceId: id });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[Users API] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
