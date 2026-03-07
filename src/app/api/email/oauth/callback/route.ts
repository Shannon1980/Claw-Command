import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

function generateId(): string {
  return `acc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * OAuth callback. Exchanges code for tokens and saves account.
 * Redirects to /email or a configurable success URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/email?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/email?error=no_code", request.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/email/oauth/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/email?error=config", request.url)
    );
  }

  try {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    const oauth2Client = google.oauth2({ version: "v2", auth: oauth2 });
    const { data } = await oauth2Client.userinfo.get();
    const email = data.email;
    if (!email) {
      return NextResponse.redirect(
        new URL("/email?error=no_email", request.url)
      );
    }

    const id = generateId();
    const now = new Date().toISOString();
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null;

    if (!pool) {
      return NextResponse.redirect(new URL("/email?error=db_not_configured", request.url));
    }

    const existing = await pool.query(
      `SELECT id FROM email_accounts WHERE provider = 'gmail' AND email = $1`,
      [email]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE email_accounts SET access_token = $1, refresh_token = $2, token_expires_at = $3, updated_at = $4 WHERE id = $5`,
        [
          tokens.access_token ?? "",
          tokens.refresh_token ?? null,
          expiresAt,
          now,
          existing.rows[0].id,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO email_accounts (id, provider, email, access_token, refresh_token, token_expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [
          id,
          "gmail",
          email,
          tokens.access_token ?? "",
          tokens.refresh_token ?? null,
          expiresAt,
          now,
        ]
      );
    }

    return NextResponse.redirect(
      new URL("/email?connected=1", request.url)
    );
  } catch (err) {
    console.error("[Email OAuth] Callback error:", err);
    return NextResponse.redirect(
      new URL(`/email?error=${encodeURIComponent(String(err))}`, request.url)
    );
  }
}
