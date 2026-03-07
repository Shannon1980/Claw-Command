/**
 * Refresh OAuth tokens and persist to DB.
 */

import { pool } from "@/lib/db/client";
import { google } from "googleapis";

export async function refreshAndPersistTokens(
  accountId: string,
  accessToken: string,
  refreshToken: string | null
): Promise<{ accessToken: string; refreshToken: string | null }> {
  if (!refreshToken) {
    return { accessToken, refreshToken };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/email/oauth/callback";

  if (!clientId || !clientSecret) {
    return { accessToken, refreshToken };
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2.refreshAccessToken();
  const newAccess = credentials.access_token ?? accessToken;
  const newRefresh = credentials.refresh_token ?? refreshToken;
  const expiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date).toISOString()
    : null;

  if (pool) {
    await pool.query(
      `UPDATE email_accounts SET access_token = $1, refresh_token = $2, token_expires_at = $3, updated_at = $4 WHERE id = $5`,
      [newAccess, newRefresh, expiresAt, new Date().toISOString(), accountId]
    );
  }

  return { accessToken: newAccess, refreshToken: newRefresh };
}
