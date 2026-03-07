// ─── OpenClaw Gateway Types ─────────────────────────────────────────────────

export type OpenClawNode = {
  node_id: string;
  name: string;
  description?: string;
  status: "active" | "idle" | "offline";
  capabilities?: string[];
  model?: string;
  metadata?: Record<string, unknown>;
  activeTasks?: number;
  lastHeartbeat?: string;
};

export type OpenClawSession = {
  session_id: string;
  node_id?: string;
  created_at: string;
  updated_at?: string;
  status: "active" | "completed" | "error" | "queued" | "running" | "failed";
  label?: string;
  agentId?: string;
  key?: string;
  messages?: OpenClawMessage[];
};

export type OpenClawMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
};

export type OpenClawChatRequest = {
  model?: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
};

export type OpenClawChatChoice = {
  index: number;
  message?: { role: string; content: string };
  delta?: { role?: string; content?: string };
  finish_reason: string | null;
};

export type OpenClawChatResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenClawChatChoice[];
};

export type SubagentRun = {
  id: string;
  label?: string;
  status: "running" | "pending" | "completed" | "failed" | "cancelled";
  startTime?: string;
  endTime?: string;
  runtime?: string;
  taskLabel?: string;
  progressPercent?: number;
};

export type AgentStatusUpdate = {
  id: string;
  name: string;
  status: "active" | "idle";
  currentTask: string | null;
  updatedAt: string;
};

export type ActivityEvent = {
  id: string;
  actorAgentId: string | null;
  eventType: string;
  resourceType: string;
  resourceId: string;
  details: string;
  createdAt: string;
};

export type SyncResult = {
  agentsUpdated: number;
  tasksSynced: number;
  activitiesCreated: number;
  timestamp: string;
  error?: string;
};

// ─── OpenClaw Skills ──────────────────────────────────────────────────────

export type OpenClawSkill = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  category?: string;
  version?: string;
  author?: string;
  node_ids?: string[];
  config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type OpenClawSkillCreateRequest = {
  name: string;
  description?: string;
  enabled?: boolean;
  category?: string;
  node_ids?: string[];
  config?: Record<string, unknown>;
};

export type OpenClawSkillUpdateRequest = {
  name?: string;
  description?: string;
  enabled?: boolean;
  category?: string;
  node_ids?: string[];
  config?: Record<string, unknown>;
};
