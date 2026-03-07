import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { NextRequest, NextResponse } from "next/server";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

/**
 * Validates the session token from cookies or API key from headers.
 * Returns the authenticated user or null if unauthenticated.
 */
export async function getAuthUser(
  request: NextRequest
): Promise<AuthUser | null> {
  // Check API key (agents/automation)
  const apiKey = request.headers.get("x-api-key");
  const mcApiKey = process.env.MC_API_KEY;
  if (apiKey && mcApiKey && apiKey === mcApiKey) {
    return { id: "api-key", username: "api", role: "admin" };
  }

  // Check env bootstrap admin (for dev/testing)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && mcApiKey) {
    const token = authHeader.slice(7).trim();
    if (token === mcApiKey) {
      return { id: "api-key", username: "api", role: "admin" };
    }
  }

  // Check session cookie against DB
  const sessionToken = request.cookies.get("session_token")?.value;
  if (!sessionToken || !pool) return null;

  try {
    const result = await pool.query(
      `SELECT s.user_id, s.expires_at, u.username, u.role
       FROM sessions_auth s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1`,
      [sessionToken]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    if (new Date(row.expires_at) < new Date()) return null;

    return {
      id: row.user_id,
      username: row.username,
      role: row.role,
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication. Returns 401 if not authenticated.
 * Use at the top of protected API routes:
 *   const authResult = await requireAuth(request);
 *   if (authResult instanceof NextResponse) return authResult;
 *   // authResult is AuthUser
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthUser | NextResponse> {
  // If no auth is configured (no MC_API_KEY, no DB), allow all
  if (!process.env.MC_API_KEY && !pool) {
    return { id: "anonymous", username: "anonymous", role: "admin" };
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

/**
 * Require a specific role. Returns 403 if insufficient permissions.
 */
export async function requireRole(
  request: NextRequest,
  ...roles: string[]
): Promise<AuthUser | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;

  if (!roles.includes(result.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}
