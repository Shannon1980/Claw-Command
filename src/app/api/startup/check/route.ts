import { NextResponse } from "next/server";
import { evaluateSecurityPosture } from "@/lib/security/posture";

export const dynamic = "force-dynamic";

export async function GET() {
  const posture = evaluateSecurityPosture();

  const checks = {
    mcApiKey: Boolean((process.env.MC_API_KEY || "").trim()),
    gatewayUrl: Boolean(
      (process.env.OPENCLAW_GATEWAY_URL || process.env.OPENCLAW_URL || "").trim()
    ),
    gatewayToken: Boolean(
      (
        process.env.OPENCLAW_GATEWAY_TOKEN ||
        process.env.OPENCLAW_TOKEN ||
        process.env.GATEWAY_TOKEN ||
        ""
      ).trim()
    ),
  };

  const ok = posture.ok;
  return NextResponse.json(
    {
      ok,
      checks,
      blockers: posture.blockers,
      warnings: posture.warnings,
      findings: posture.findings,
      checkedAt: posture.checkedAt,
    },
    { status: ok ? 200 : 503 }
  );
}
