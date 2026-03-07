import { NextRequest, NextResponse } from "next/server";

// Public paths that don't require auth
const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/sse/feed",
  "/api/mc/",
  "/api/gateway/",
  "/api/agent-context",
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
  if (apiKey) {
    // For now, any non-empty API key passes (will validate against DB in Sprint 10)
    return NextResponse.next();
  }

  // Check session cookie
  const sessionToken = request.cookies.get("session_token")?.value;
  if (sessionToken) {
    // Session validation happens at the API level for now
    return NextResponse.next();
  }

  // For API routes without auth, allow through (auth enforcement is opt-in until Sprint 10)
  // When RBAC is fully implemented, uncomment the block below
  // if (pathname.startsWith("/api/")) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
