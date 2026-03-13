import { NextResponse } from "next/server";
import { requireMcAuth } from "@/lib/mc/auth";
import { evaluateSecurityPosture } from "@/lib/security/posture";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = requireMcAuth(request);
  if (authError) return authError;

  const posture = evaluateSecurityPosture();
  const status = posture.ok ? 200 : 503;
  return NextResponse.json(posture, { status });
}
