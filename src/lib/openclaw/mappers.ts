// ─── Map OpenClaw nodes to dashboard Agent type ────────────────────────────

import type { OpenClawNode } from "./types";
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
