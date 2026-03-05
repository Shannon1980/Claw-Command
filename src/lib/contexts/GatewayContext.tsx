"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from "react";
import type {
  GatewayState,
  GatewayAction,
  AgentStatus,
  SubagentProgress,
  QueueItem,
  GatewayMetrics,
  ConnectionStatus,
  ConnectionError,
} from "@/lib/gateway/types";

type GatewayContextValue = {
  state: GatewayState;
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;
  updateSubagentProgress: (taskId: string, progress: SubagentProgress) => void;
  addQueueItem: (item: QueueItem) => void;
  removeQueueItem: (taskId: string) => void;
  updateMetrics: (metrics: GatewayMetrics) => void;
  setConnectionStatus: (status: ConnectionStatus, error?: ConnectionError) => void;
  isConnected: boolean;
  reset: () => void;
};

const GatewayContext = createContext<GatewayContextValue | null>(null);

// ─── Initial State ──────────────────────────────────────────────────────

const initialState: GatewayState = {
  agentStatus: new Map(),
  subagentProgress: new Map(),
  taskQueue: [],
  metrics: {
    totalTokens: 0,
    totalRuntime: 0,
    totalCost: 0,
    activeAgents: 0,
    queueLength: 0,
    lastUpdate: new Date().toISOString(),
  },
  connection: "disconnected",
  error: null,
  lastUpdate: new Date(),
};

// ─── Reducer ─────────────────────────────────────────────────────────────

function gatewayReducer(state: GatewayState, action: GatewayAction): GatewayState {
  switch (action.type) {
    case "SET_INITIAL_STATE":
      return action.payload;

    case "UPDATE_AGENT_STATUS": {
      const newStatus = new Map(state.agentStatus);
      newStatus.set(action.agentId, action.status);
      return {
        ...state,
        agentStatus: newStatus,
        lastUpdate: new Date(),
      };
    }

    case "UPDATE_SUBAGENT_PROGRESS": {
      const newProgress = new Map(state.subagentProgress);
      newProgress.set(action.taskId, action.progress);
      return {
        ...state,
        subagentProgress: newProgress,
        lastUpdate: new Date(),
      };
    }

    case "ADD_QUEUE_ITEM": {
      const newQueue = [...state.taskQueue, action.item];
      return {
        ...state,
        taskQueue: newQueue,
        metrics: { ...state.metrics, queueLength: newQueue.length },
        lastUpdate: new Date(),
      };
    }

    case "REMOVE_QUEUE_ITEM": {
      const newQueue = state.taskQueue.filter((item) => item.id !== action.taskId);
      return {
        ...state,
        taskQueue: newQueue,
        metrics: { ...state.metrics, queueLength: newQueue.length },
        lastUpdate: new Date(),
      };
    }

    case "UPDATE_METRICS":
      return {
        ...state,
        metrics: action.metrics,
        lastUpdate: new Date(),
      };

    case "SET_CONNECTION_STATUS":
      return {
        ...state,
        connection: action.status,
        error: action.error || null,
        lastUpdate: new Date(),
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// ─── Provider Component ──────────────────────────────────────────────────

export function GatewayProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gatewayReducer, initialState);

  const updateAgentStatus = useCallback(
    (agentId: string, status: AgentStatus) => {
      dispatch({ type: "UPDATE_AGENT_STATUS", agentId, status });
    },
    []
  );

  const updateSubagentProgress = useCallback(
    (taskId: string, progress: SubagentProgress) => {
      dispatch({ type: "UPDATE_SUBAGENT_PROGRESS", taskId, progress });
    },
    []
  );

  const addQueueItem = useCallback((item: QueueItem) => {
    dispatch({ type: "ADD_QUEUE_ITEM", item });
  }, []);

  const removeQueueItem = useCallback((taskId: string) => {
    dispatch({ type: "REMOVE_QUEUE_ITEM", taskId });
  }, []);

  const updateMetrics = useCallback((metrics: GatewayMetrics) => {
    dispatch({ type: "UPDATE_METRICS", metrics });
  }, []);

  const setConnectionStatus = useCallback(
    (status: ConnectionStatus, error?: ConnectionError) => {
      dispatch({ type: "SET_CONNECTION_STATUS", status, error });
    },
    []
  );

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const value: GatewayContextValue = {
    state,
    updateAgentStatus,
    updateSubagentProgress,
    addQueueItem,
    removeQueueItem,
    updateMetrics,
    setConnectionStatus,
    isConnected: state.connection === "connected",
    reset,
  };

  return (
    <GatewayContext.Provider value={value}>
      {children}
    </GatewayContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function useGatewayContext(): GatewayContextValue {
  const ctx = useContext(GatewayContext);
  if (!ctx) {
    throw new Error("useGatewayContext must be used within GatewayProvider");
  }
  return ctx;
}
