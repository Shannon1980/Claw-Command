import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

function generateId(): string {
  return `acc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function GET() {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  try {
    const res = await pool.query(
      `SELECT id, provider, email, created_at FROM email_accounts ORDER BY created_at DESC`
    );
    return NextResponse.json(res.rows);
  } catch (err) {
    console.error("[Email API] List accounts error:", err);
    return NextResponse.json(
      { error: "Failed to list accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  try {
    const body = await request.json();
    const provider = (body.provider as string)?.toLowerCase() || "gmail";
    const email = (body.email as string)?.trim();
    const accessToken = body.access_token as string;
    const refreshToken = body.refresh_token as string | undefined;
    const tokenExpiresAt = body.token_expires_at as string | undefined;

    if (!email || !accessToken) {
      return NextResponse.json(
        { error: "email and access_token required" },
        { status: 400 }
      );
    }

    const id = generateId();
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO email_accounts (id, provider, email, access_token, refresh_token, token_expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [id, provider, email, accessToken, refreshToken ?? null, tokenExpiresAt ?? null, now]
    );

    return NextResponse.json({
      id,
      provider,
      email,
      created_at: now,
    });
  } catch (err) {
    console.error("[Email API] Create account error:", err);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
