export type SecuritySeverity = "info" | "warn" | "critical";

export type SecurityFinding = {
  code: string;
  severity: SecuritySeverity;
  message: string;
  fix?: string;
};

export type SecurityPosture = {
  ok: boolean;
  blockers: number;
  warnings: number;
  findings: SecurityFinding[];
  checkedAt: string;
};

function getGatewayUrl(): string | null {
  const url = process.env.OPENCLAW_GATEWAY_URL || process.env.OPENCLAW_URL || "";
  return url.trim() || null;
}

function hasGatewayToken(): boolean {
  return Boolean(
    (process.env.OPENCLAW_GATEWAY_TOKEN ||
      process.env.OPENCLAW_TOKEN ||
      process.env.GATEWAY_TOKEN || "").trim()
  );
}

function isSecureGatewayUrl(url: string): boolean {
  if (url.startsWith("https://")) return true;
  if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) return true;
  return false;
}

export function evaluateSecurityPosture(): SecurityPosture {
  const findings: SecurityFinding[] = [];

  const mcKey = (process.env.MC_API_KEY || "").trim();
  const gatewayUrl = getGatewayUrl();
  const gatewayToken = hasGatewayToken();
  const isProd = process.env.NODE_ENV === "production";

  if (!mcKey) {
    findings.push({
      code: "MC_API_KEY_MISSING",
      severity: "critical",
      message: "MC_API_KEY is not configured.",
      fix: "Set MC_API_KEY in environment/secrets for all deployed environments.",
    });
  }

  if (!gatewayUrl) {
    findings.push({
      code: "GATEWAY_URL_MISSING",
      severity: "warn",
      message: "Neither OPENCLAW_GATEWAY_URL nor OPENCLAW_URL is configured.",
      fix: "Set OPENCLAW_GATEWAY_URL (preferred) or OPENCLAW_URL.",
    });
  } else if (isProd && !isSecureGatewayUrl(gatewayUrl)) {
    findings.push({
      code: "GATEWAY_URL_INSECURE",
      severity: "critical",
      message: "Gateway URL is insecure for production (non-HTTPS/non-localhost).",
      fix: "Use an HTTPS gateway URL in production.",
    });
  }

  if (!gatewayToken) {
    findings.push({
      code: "GATEWAY_TOKEN_MISSING",
      severity: "warn",
      message: "No gateway bearer token is configured.",
      fix: "Set OPENCLAW_GATEWAY_TOKEN (or OPENCLAW_TOKEN).",
    });
  }

  const blockers = findings.filter((f) => f.severity === "critical").length;
  const warnings = findings.filter((f) => f.severity === "warn").length;

  return {
    ok: blockers === 0,
    blockers,
    warnings,
    findings,
    checkedAt: new Date().toISOString(),
  };
}
