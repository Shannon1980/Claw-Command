/**
 * OpenClaw Prometheus metrics (openclaw@3.7.2+).
 * Enable in gateway.config.mjs: metrics: { enabled: true, port: 9464 }
 * See: https://docs.openclaw.ai/concepts/usage-tracking
 */

function getMetricsUrl(): string | null {
  const explicit = process.env.OPENCLAW_METRICS_URL;
  if (explicit) return explicit;

  // On Vercel, localhost is unreachable; require explicit URL
  if (process.env.VERCEL) return null;

  const base = process.env.OPENCLAW_URL || "http://localhost:18789";
  try {
    const u = new URL(base);
    return `${u.protocol}//${u.hostname}:9464/metrics`;
  } catch {
    return null;
  }
}

export type TokenMetrics = {
  connected: boolean;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  byModel: Record<string, number>;
  toolsInvoked: number;
  error?: string;
};

/**
 * Parse Prometheus text format and extract OpenClaw token metrics.
 */
function parsePrometheusMetrics(text: string): TokenMetrics {
  const result: TokenMetrics = {
    connected: true,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    byModel: {},
    toolsInvoked: 0,
  };

  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^(\w+)(?:\{([^}]*)\})?\s+([\d.e+-]+)/);
    if (!match) continue;

    const [, name, labels, valueStr] = match;
    const value = parseFloat(valueStr) || 0;

    if (name === "openclaw_tokens_total") {
      result.totalTokens += value;
      const modelMatch = labels?.match(/model="([^"]*)"/);
      if (modelMatch) {
        result.byModel[modelMatch[1]] = (result.byModel[modelMatch[1]] || 0) + value;
      }
    } else if (name === "openclaw_tokens_prompt_total") {
      result.promptTokens += value;
    } else if (name === "openclaw_tokens_completion_total") {
      result.completionTokens += value;
    } else if (name === "openclaw_tools_invoked_total") {
      result.toolsInvoked += value;
    }
  }

  return result;
}

/**
 * Fetch token usage from OpenClaw Prometheus metrics endpoint.
 */
export async function fetchTokenMetrics(): Promise<TokenMetrics> {
  const url = getMetricsUrl();
  if (!url) {
    return {
      connected: false,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      byModel: {},
      toolsInvoked: 0,
      error: process.env.VERCEL
        ? "On Vercel, set OPENCLAW_METRICS_URL to a public metrics URL (e.g. ngrok tunnel to localhost:9464)."
        : "OPENCLAW_METRICS_URL or OPENCLAW_URL not configured",
    };
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: process.env.OPENCLAW_METRICS_TOKEN
        ? { Authorization: `Bearer ${process.env.OPENCLAW_METRICS_TOKEN}` }
        : {},
    });

    if (!res.ok) {
      return {
        connected: false,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        byModel: {},
        toolsInvoked: 0,
        error: `Metrics endpoint returned ${res.status}. Enable metrics in gateway.config.mjs (openclaw@3.7.2+).`,
      };
    }

    const text = await res.text();
    return parsePrometheusMetrics(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      byModel: {},
      toolsInvoked: 0,
      error: `Cannot reach OpenClaw metrics: ${msg}. Ensure metrics are enabled (port 9464).`,
    };
  }
}
