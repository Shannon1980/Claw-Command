import { NextResponse } from "next/server";

const MC_API_KEY = process.env.MC_API_KEY?.trim() || null;

if (!MC_API_KEY) {
  const msg = "MC_API_KEY is not set — MC endpoints are unprotected";
  if (process.env.NODE_ENV === "production") {
    console.error(`[mc/auth] CRITICAL: ${msg}`);
  } else {
    console.warn(`[mc/auth] WARNING: ${msg}`);
  }
}

/**
 * Validates API key for Mission Control–compatible endpoints.
 * Requires MC_API_KEY to be set; rejects all requests in production if unset.
 */
export function requireMcAuth(request: Request): NextResponse | null {
  if (!MC_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Service Unavailable", message: "MC authentication is not configured" },
        { status: 503 }
      );
    }
    return null; // Allow in development when key is not set
  }

  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");

  const provided =
    (authHeader?.startsWith("Bearer ") && authHeader.slice(7).trim()) ||
    apiKeyHeader?.trim();

  if (!provided || provided !== MC_API_KEY) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Valid API key required" },
      { status: 401 }
    );
  }

  return null;
}
