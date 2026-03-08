import { NextResponse } from "next/server";
import { google } from "googleapis";

/**
 * Start Gmail OAuth flow. Redirects user to Google consent.
 */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/api/email/oauth/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required" },
      { status: 500 }
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const scopes = [
    "openid",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/userinfo.email",
  ];
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes.join(" "),
  });

  return NextResponse.redirect(url);
}
