import { NextResponse } from "next/server";

export async function GET() {
  const authUser = process.env.AUTH_USER || "";
  const masked = authUser ? authUser[0] + "***" + authUser[authUser.length - 1] : "";

  return NextResponse.json({
    gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || "",
    authUser: masked,
    tokenBudget: process.env.TOKEN_BUDGET_MONTHLY_USD || "",
    alertThreshold: process.env.TOKEN_ALERT_THRESHOLD_PCT || "",
    claudeProjectsDir: process.env.CLAUDE_PROJECTS_DIR || "",
  });
}

export async function POST() {
  return NextResponse.json(
    { error: "Settings are configured via environment variables" },
    { status: 501 }
  );
}
