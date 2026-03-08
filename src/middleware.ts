import { NextRequest, NextResponse } from "next/server";

// Public paths that don't require auth
// NOTE: Vercel Cron endpoints are included here so cron requests always reach
// the route handler, which performs its own CRON_SECRET validation.
const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/sse/feed",
  "/api/mc/",
  "/api/gateway/",
  "/api/agent-context",
  "/api/docs",
  "/api/sync/docs",
  "/api/cron/scheduler",
  "/api/heartbeat-all",
  "/api/email/worker/run",
  "/api/opportunity-engine/scan",
  "/_next/",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  for (const path of PUBLIC_PATHS) {
    if (pathname.startsWith(path)) {
      return NextResponse.next();
    }
  }

  // Check for API key auth (agents/automation)
  const apiKey = request.headers.get("x-api-key");
  const mcApiKey = process.env.MC_API_KEY;
  if (apiKey && mcApiKey && apiKey === mcApiKey) {
    return NextResponse.next();
  }

  // Check Authorization bearer (MC_API_KEY or CRON_SECRET)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (mcApiKey && token === mcApiKey) {
      return NextResponse.next();
    }
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && token === cronSecret) {
      return NextResponse.next();
    }
  }

  // Check session cookie (actual DB validation is in requireAuth helper)
  const sessionToken = request.cookies.get("session_token")?.value;
  if (sessionToken) {
    return NextResponse.next();
  }

  // If auth is configured (MC_API_KEY set), reject unauthenticated API requests
  if (mcApiKey && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // For page requests without auth, allow through (login page handles redirect)
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
