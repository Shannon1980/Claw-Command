"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  domain: string;
  status: string;
  currentTaskId: string | null;
  soul: string | null;
  capabilities: string | null;
  apiKey: string | null;
  retiredAt: string | null;
  updatedAt: string;
}

export interface AgentSoul {
  id: string;
  agentId: string;
  personality: string;
  capabilities: string;
  systemPrompt: string;
  constraints: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentStore {
  agents: Agent[];
  selectedAgentId: string | null;
  loading: boolean;
  error: string | null;

  fetchAgents: () => Promise<void>;
  selectAgent: (id: string | null) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  addAgent: (agent: Agent) => void;
  handleSSEEvent: (data: Record<string, unknown>) => void;
}

export const useAgentStore = create<AgentStore>()(
  subscribeWithSelector((set, get) => ({
    agents: [],
    selectedAgentId: null,
    loading: false,
    error: null,

    fetchAgents: async () => {
      set({ loading: true, error: null });
      try {
        const res = await fetch("/api/agents");
        if (!res.ok) throw new Error("Failed to fetch agents");
        const data = await res.json();
        const rows = Array.isArray(data) ? data : [];
        const agents: Agent[] = rows.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          name: r.name as string,
          emoji: (r.emoji as string) || "",
          domain: (r.domain as string) || "vorentoe",
          status: (r.status as string) || "idle",
          currentTaskId: (r.current_task_id ?? r.currentTaskId ?? null) as string | null,
          soul: (r.soul as string) || null,
          capabilities: (r.capabilities as string) || null,
          apiKey: (r.api_key ?? r.apiKey ?? null) as string | null,
          retiredAt: (r.retired_at ?? r.retiredAt ?? null) as string | null,
          updatedAt: ((r.updated_at ?? r.updatedAt) as string) || new Date().toISOString(),
        }));
        set({ agents, loading: false });
      } catch (err) {
        set({ error: (err as Error).message, loading: false });
      }
    },

    selectAgent: (id) => set({ selectedAgentId: id }),

    updateAgent: (id, updates) =>
      set((state) => ({
        agents: state.agents.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      })),

    removeAgent: (id) =>
      set((state) => ({
        agents: state.agents.filter((a) => a.id !== id),
        selectedAgentId:
          state.selectedAgentId === id ? null : state.selectedAgentId,
      })),

    addAgent: (agent) =>
      set((state) => ({
        agents: [...state.agents.filter((a) => a.id !== agent.id), agent],
      })),

    handleSSEEvent: (data) => {
      const agentId = data.agentId as string;
      if (!agentId) return;
      const existing = get().agents.find((a) => a.id === agentId);
      if (existing) {
        get().updateAgent(agentId, data as Partial<Agent>);
      }
    },
  }))
);
