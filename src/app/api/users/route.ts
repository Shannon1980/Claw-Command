import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { emitNotification } from "@/lib/events/emitActivity";
import { logAuditEvent } from "@/lib/events/auditLog";

export async function GET() {
  if (!pool) return NextResponse.json([]);

  try {
    const result = await pool.query(
      `SELECT id, username, role, email, created_at, updated_at FROM users ORDER BY created_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Users API] GET error:", error);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { username, password, role, email } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const id = `user-${Date.now()}`;
    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO users (id, username, password_hash, role, email, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, role, email, created_at, updated_at`,
      [id, username, passwordHash, role || "user", email || null, now, now]
    );

    emitNotification({ title: "User created", type: "info" });
    logAuditEvent({ action: "user_created", resourceType: "user", resourceId: id });
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Users API] POST error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
