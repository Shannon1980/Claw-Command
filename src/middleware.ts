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
  const mcApiKey = process.env.MC_API_KEY;
  if (apiKey && mcApiKey && apiKey === mcApiKey) {
    return NextResponse.next();
  }

  // Check Authorization bearer
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && mcApiKey) {
    const token = authHeader.slice(7).trim();
    if (token === mcApiKey) {
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
