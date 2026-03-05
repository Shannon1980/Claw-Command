// ─── Gateway Real-Time Types ────────────────────────────────────────────────

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting" | "error";

export type ConnectionError = {
  code: string;
  message: string;
};

export type AgentStatus = {
  id: string;
  name: string;
  status: "active" | "idle" | "offline";
  activeTasks: number;
  lastHeartbeat: string;
};

export type SubagentProgress = {
  taskId: string;
  agentId: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number; // 0-100
  message?: string;
  updatedAt: string;
};

export type QueueItem = {
  id: string;
  taskName: string;
  agentId: string;
  status: "queued" | "running" | "completed" | "failed";
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
};

export type GatewayMetrics = {
  totalTokens: number;
  totalRuntime: number; // ms
  totalCost: number; // USD
  activeAgents: number;
  queueLength: number;
  lastUpdate: string;
};

export type GatewayState = {
  agentStatus: Map<string, AgentStatus>;
  subagentProgress: Map<string, SubagentProgress>;
  taskQueue: QueueItem[];
  metrics: GatewayMetrics;
  connection: ConnectionStatus;
  error: ConnectionError | null;
  lastUpdate: Date;
};

export type GatewayAction =
  | { type: "SET_INITIAL_STATE"; payload: GatewayState }
  | {
      type: "UPDATE_AGENT_STATUS";
      agentId: string;
      status: AgentStatus;
    }
  | {
      type: "UPDATE_SUBAGENT_PROGRESS";
      taskId: string;
      progress: SubagentProgress;
    }
  | { type: "ADD_QUEUE_ITEM"; item: QueueItem }
  | { type: "REMOVE_QUEUE_ITEM"; taskId: string }
  | { type: "UPDATE_METRICS"; metrics: GatewayMetrics }
  | {
      type: "SET_CONNECTION_STATUS";
      status: ConnectionStatus;
      error?: ConnectionError;
    }
  | { type: "RESET" };

// ─── SSE Event Types ────────────────────────────────────────────────────────

export type GatewayEvent =
  | {
      type: "agent_status_changed";
      agentId: string;
      status: AgentStatus;
      timestamp?: string;
    }
  | {
      type: "subagent_progress";
      taskId: string;
      progress: SubagentProgress;
    }
  | {
      type: "task_queued";
      task: QueueItem;
    }
  | {
      type: "task_completed";
      taskId: string;
    }
  | {
      type: "metrics_updated";
      metrics: GatewayMetrics;
    }
  | {
      type: "initial_state";
      state: {
        agents: Record<string, AgentStatus>;
        tasks: QueueItem[];
        metrics: GatewayMetrics;
      };
    }
  | {
      type: "connection_status";
      status: ConnectionStatus;
      error?: ConnectionError;
    };
