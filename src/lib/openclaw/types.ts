// ─── OpenClaw Gateway Response Types ────────────────────────────────────────

export interface OpenClawSession {
  key: string;
  kind: string;
  label?: string;
  agentId?: string;
  status: "active" | "idle" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  messages?: OpenClawMessage[];
}

export interface OpenClawMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface OpenClawGatewayStatus {
  status: "online" | "offline";
  version: string;
  uptime: number;
  sessions: number;
}

// ─── Mapped Claw Command Types ──────────────────────────────────────────────

export interface AgentStatusUpdate {
  id: string;
  name: string;
  status: "idle" | "active" | "blocked" | "waiting_for_shannon";
  currentTask: string | null;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  actorAgentId: string | null;
  eventType: string;
  resourceType: string;
  resourceId: string;
  details: string; // JSON
  createdAt: string;
}

export interface SyncResult {
  agentsUpdated: number;
  tasksSynced: number;
  activitiesCreated: number;
  timestamp: string;
  error?: string;
}

// ─── SSE Event Types ────────────────────────────────────────────────────────

export type SSEEventType =
  | "agent_update"
  | "new_activity"
  | "new_alert"
  | "sync_complete"
  | "heartbeat";

export interface SSEEvent {
  id: string;
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}
