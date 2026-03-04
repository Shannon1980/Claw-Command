import {
  OpenClawSession,
  AgentStatusUpdate,
  ActivityEvent,
} from "./types";

// Map known session labels/agent IDs to Claw Command agent names
const AGENT_MAP: Record<string, { id: string; name: string }> = {
  bob: { id: "bob", name: "Bob" },
  bertha: { id: "bertha", name: "Bertha" },
  veronica: { id: "veronica", name: "Veronica" },
  depa: { id: "depa", name: "Depa" },
  forge: { id: "forge", name: "Forge" },
  atlas: { id: "atlas", name: "Atlas" },
  muse: { id: "muse", name: "Muse" },
  peter: { id: "peter", name: "Peter" },
  harmony: { id: "harmony", name: "Harmony" },
  skylar: { id: "skylar", name: "Skylar" },
  sentinel: { id: "sentinel", name: "Sentinel" },
  main: { id: "bob", name: "Bob" }, // main session = Bob (Chief of Staff)
};

/**
 * Resolve a session to a known agent, or null if unknown
 */
function resolveAgent(
  session: OpenClawSession
): { id: string; name: string } | null {
  const label = (session.label || session.agentId || session.key)
    .toLowerCase()
    .trim();

  // Direct match
  if (AGENT_MAP[label]) return AGENT_MAP[label];

  // Partial match (e.g., "forge-build-123" → forge)
  for (const [key, agent] of Object.entries(AGENT_MAP)) {
    if (label.includes(key)) return agent;
  }

  return null;
}

/**
 * Map OpenClaw sessions to agent status updates
 */
export function mapSessionsToAgentStatus(
  sessions: OpenClawSession[]
): AgentStatusUpdate[] {
  const agentUpdates = new Map<string, AgentStatusUpdate>();

  for (const session of sessions) {
    const agent = resolveAgent(session);
    if (!agent) continue;

    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const lastActivity = new Date(session.updatedAt).getTime();
    const isActive = session.status === "active" && lastActivity > fiveMinAgo;

    // Only update if this is more recent than what we have
    const existing = agentUpdates.get(agent.id);
    if (
      existing &&
      new Date(existing.updatedAt).getTime() > lastActivity
    ) {
      continue;
    }

    agentUpdates.set(agent.id, {
      id: agent.id,
      name: agent.name,
      status: isActive ? "active" : "idle",
      currentTask: session.label || null,
      updatedAt: session.updatedAt,
    });
  }

  return Array.from(agentUpdates.values());
}

/**
 * Map session messages to activity events
 */
export function mapSessionsToActivities(
  sessions: OpenClawSession[]
): ActivityEvent[] {
  const activities: ActivityEvent[] = [];

  for (const session of sessions) {
    const agent = resolveAgent(session);
    if (!session.messages) continue;

    for (const msg of session.messages) {
      if (msg.role !== "assistant") continue;

      // Look for meaningful activity patterns
      const content = msg.content.toLowerCase();
      let eventType = "task_started";

      if (content.includes("completed") || content.includes("done") || content.includes("finished")) {
        eventType = "task_completed";
      } else if (content.includes("approval") || content.includes("review")) {
        eventType = "approval_requested";
      } else if (content.includes("alert") || content.includes("warning")) {
        eventType = "alert_fired";
      }

      activities.push({
        id: `act-${session.key}-${msg.timestamp}`,
        actorAgentId: agent?.id || null,
        eventType,
        resourceType: "task",
        resourceId: session.key,
        details: JSON.stringify({
          message: msg.content.slice(0, 200),
          session_key: session.key,
        }),
        createdAt: msg.timestamp,
      });
    }
  }

  return activities;
}
