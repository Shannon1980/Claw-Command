import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import crypto from "crypto";
import { logAuditEvent } from "@/lib/events/auditLog";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    let userId: string | null = null;
    let userRole = "admin";
    let matchedUsername = username;

    // Check env var bootstrap admin first
    const envUser = process.env.AUTH_USER;
    const envPass = process.env.AUTH_PASS;

    if (envUser && envPass && username === envUser && password === envPass) {
      userId = "admin-env";
      userRole = "admin";
      matchedUsername = envUser;
    }

    // Check database users
    if (!userId && pool) {
      const result = await pool.query(
        `SELECT id, username, password_hash, role FROM users WHERE username = $1`,
        [username]
      );
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const hash = crypto.createHash("sha256").update(password).digest("hex");
        if (hash === user.password_hash) {
          userId = user.id;
          userRole = user.role;
          matchedUsername = user.username;
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create session
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    const now = new Date().toISOString();

    if (pool) {
      await pool.query(
        `INSERT INTO sessions_auth (token, user_id, expires_at, created_at)
         VALUES ($1, $2, $3, $4)`,
        [sessionToken, userId, expiresAt, now]
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: { id: userId, username: matchedUsername, role: userRole },
    });

    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(expiresAt),
    });

    logAuditEvent({ action: "user_login", resourceType: "session", resourceId: matchedUsername });
    return response;
  } catch (error) {
    console.error("[Auth Login] error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
