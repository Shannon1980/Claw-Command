// ─── Map OpenClaw nodes to dashboard Agent type ────────────────────────────

import type {
  OpenClawNode,
  OpenClawSession,
  AgentStatusUpdate,
  ActivityEvent,
} from "./types";
import type { AgentStatus } from "@/lib/gateway/types";

export function nodeToAgentStatus(node: OpenClawNode): AgentStatus {
  return {
    id: node.node_id,
    name: node.name || node.node_id,
    status: (node.status as "active" | "idle" | "offline") || "idle",
    activeTasks: node.activeTasks || 0,
    lastHeartbeat: node.lastHeartbeat || new Date().toISOString(),
  };
}

export function nodesToAgents(nodes: OpenClawNode[]): AgentStatus[] {
  return nodes.map((node) => nodeToAgentStatus(node));
}

// ─── Map OpenClaw sessions to sync/activity entities ────────────────────────

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
  main: { id: "bob", name: "Bob" },
};

function resolveAgent(
  session: OpenClawSession
): { id: string; name: string } | null {
  const label = (
    session.label ||
    session.agentId ||
    session.key ||
    session.session_id
  )
    .toLowerCase()
    .trim();

  if (AGENT_MAP[label]) return AGENT_MAP[label];
  for (const [key, agent] of Object.entries(AGENT_MAP)) {
    if (label.includes(key)) return agent;
  }
  return null;
}

export function mapSessionsToAgentStatus(
  sessions: OpenClawSession[]
): AgentStatusUpdate[] {
  const agentUpdates = new Map<string, AgentStatusUpdate>();

  for (const session of sessions) {
    const agent = resolveAgent(session);
    if (!agent) continue;

    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const updatedAt = session.updated_at || session.created_at;
    const lastActivity = new Date(updatedAt).getTime();
    const isActive =
      session.status === "active" && lastActivity > fiveMinAgo;

    const existing = agentUpdates.get(agent.id);
    if (existing && new Date(existing.updatedAt).getTime() > lastActivity) {
      continue;
    }

    agentUpdates.set(agent.id, {
      id: agent.id,
      name: agent.name,
      status: isActive ? "active" : "idle",
      currentTask: session.label || null,
      updatedAt,
    });
  }

  return Array.from(agentUpdates.values());
}

export function mapSessionsToActivities(
  sessions: OpenClawSession[]
): ActivityEvent[] {
  const activities: ActivityEvent[] = [];

  for (const session of sessions) {
    const agent = resolveAgent(session);
    if (!session.messages) continue;

    for (const msg of session.messages) {
      if (msg.role !== "assistant") continue;

      const content = msg.content.toLowerCase();
      let eventType = "task_started";

      if (
        content.includes("completed") ||
        content.includes("done") ||
        content.includes("finished")
      ) {
        eventType = "task_completed";
      } else if (
        content.includes("approval") ||
        content.includes("review")
      ) {
        eventType = "approval_requested";
      } else if (content.includes("alert") || content.includes("warning")) {
        eventType = "alert_fired";
      }

      const sessionKey = session.key || session.session_id;
      activities.push({
        id: `act-${sessionKey}-${msg.timestamp || Date.now()}`,
        actorAgentId: agent?.id || null,
        eventType,
        resourceType: "task",
        resourceId: sessionKey,
        details: JSON.stringify({
          message: msg.content.slice(0, 200),
          session_key: sessionKey,
        }),
        createdAt: msg.timestamp || new Date().toISOString(),
      });
    }
  }

  return activities;
}
