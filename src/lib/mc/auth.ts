import { NextResponse } from "next/server";

const MC_API_KEY = process.env.MC_API_KEY;

/**
 * Validates API key for Mission Control–compatible endpoints.
 * When MC_API_KEY is set, requests must include it via:
 * - Authorization: Bearer <key>
 * - x-api-key: <key>
 *
 * When MC_API_KEY is not set, all requests are allowed.
 */
export function requireMcAuth(request: Request): NextResponse | null {
  if (!MC_API_KEY || MC_API_KEY === "") {
    return null; // No auth required
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
