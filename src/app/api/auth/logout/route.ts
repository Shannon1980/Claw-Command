import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value;

    if (sessionToken && pool) {
      await pool.query(`DELETE FROM sessions_auth WHERE token = $1`, [sessionToken]);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("[Auth Logout] error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
