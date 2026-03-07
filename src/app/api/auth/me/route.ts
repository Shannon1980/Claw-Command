import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get("session_token")?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const result = await pool.query(
      `SELECT s.user_id, s.expires_at, u.username, u.role, u.email
       FROM sessions_auth s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [sessionToken]
    );

    if (result.rows.length === 0) {
      // Check if this is the env-based admin session
      const envCheck = await pool.query(
        `SELECT user_id, expires_at FROM sessions_auth WHERE token = $1 AND expires_at > NOW()`,
        [sessionToken]
      );
      if (envCheck.rows.length > 0 && envCheck.rows[0].user_id === "admin-env") {
        return NextResponse.json({
          id: "admin-env",
          username: process.env.AUTH_USER || "admin",
          role: "admin",
        });
      }

      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      id: row.user_id,
      username: row.username,
      role: row.role,
      email: row.email,
    });
  } catch (error) {
    console.error("[Auth Me] error:", error);
    return NextResponse.json({ error: "Authentication check failed" }, { status: 500 });
  }
}
