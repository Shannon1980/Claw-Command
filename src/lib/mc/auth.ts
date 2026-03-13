import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

function getMcApiKey(): string | null {
  const key = process.env.MC_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

function isInsecureDevAllowed(): boolean {
  return process.env.MC_AUTH_ALLOW_INSECURE_DEV === "true";
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Returns current MC auth posture for diagnostics/health checks.
 */
export function getMcAuthStatus() {
  const configured = Boolean(getMcApiKey());
  const insecureDevBypass = !configured && process.env.NODE_ENV !== "production" && isInsecureDevAllowed();

  return {
    configured,
    insecureDevBypass,
    mode: configured ? "enforced" : insecureDevBypass ? "dev-bypass" : "fail-closed",
  } as const;
}

/**
 * Validates API key for Mission Control–compatible endpoints.
 *
 * Behavior:
 * - If MC_API_KEY is configured: enforce Bearer/x-api-key auth.
 * - If missing in production: fail closed (503).
 * - If missing in development: fail closed by default.
 *   Set MC_AUTH_ALLOW_INSECURE_DEV=true only for local prototyping.
 */
export function requireMcAuth(request: Request): NextResponse | null {
  const mcApiKey = getMcApiKey();

  if (!mcApiKey) {
    const msg = "MC_API_KEY is not set";

    if (process.env.NODE_ENV === "production") {
      console.error(`[mc/auth] CRITICAL: ${msg} — MC endpoints are blocked`);
      return NextResponse.json(
        { error: "Service Unavailable", message: "MC authentication is not configured" },
        { status: 503 }
      );
    }

    if (isInsecureDevAllowed()) {
      console.warn(`[mc/auth] WARNING: ${msg} — allowing insecure dev bypass`);
      return null;
    }

    console.error(`[mc/auth] CRITICAL: ${msg} — set MC_API_KEY or MC_AUTH_ALLOW_INSECURE_DEV=true`);
    return NextResponse.json(
      {
        error: "Service Unavailable",
        message:
          "MC authentication is not configured. Set MC_API_KEY, or set MC_AUTH_ALLOW_INSECURE_DEV=true for local development.",
      },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");

  const provided =
    (authHeader?.startsWith("Bearer ") && authHeader.slice(7).trim()) ||
    apiKeyHeader?.trim();

  if (!provided || !safeEqual(provided, mcApiKey)) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Valid API key required" },
      { status: 401 }
    );
  }

  return null;
}
