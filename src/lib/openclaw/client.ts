import { OpenClawSession, OpenClawGatewayStatus } from "./types";

const GATEWAY_URL =
  process.env.OPENCLAW_GATEWAY_URL || "http://localhost:4444";

async function fetchGateway<T>(
  path: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!res.ok) {
      console.error(
        `[OpenClaw] Gateway returned ${res.status} for ${path}`
      );
      return null;
    }

    return (await res.json()) as T;
  } catch (error) {
    console.error(`[OpenClaw] Gateway unreachable at ${GATEWAY_URL}:`, error);
    return null;
  }
}

/**
 * Get gateway status
 */
async function getGatewayStatus(): Promise<OpenClawGatewayStatus | null> {
  return fetchGateway<OpenClawGatewayStatus>("/api/status");
}

/**
 * List all active sessions
 */
async function listSessions(): Promise<OpenClawSession[]> {
  const result = await fetchGateway<OpenClawSession[]>("/api/sessions");
  return result || [];
}

/**
 * Get session history
 */
async function getSessionHistory(
  sessionKey: string
): Promise<OpenClawSession | null> {
  return fetchGateway<OpenClawSession>(
    `/api/sessions/${encodeURIComponent(sessionKey)}/history`
  );
}

/**
 * Check if gateway is reachable
 */
async function isGatewayOnline(): Promise<boolean> {
  const status = await getGatewayStatus();
  return status !== null && status.status === "online";
}

export {
  getGatewayStatus,
  listSessions,
  getSessionHistory,
  isGatewayOnline,
};
