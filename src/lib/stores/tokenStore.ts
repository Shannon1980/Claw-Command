"use client";

import { create } from "zustand";

export interface TokenSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostCents: number;
  budgetUsedPct: number;
  budgetRemainingCents: number;
}

export interface AgentTokenUsage {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
}

export interface ModelTokenUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
}

export interface DailyUsage {
  date: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
}

interface TokenStore {
  summary: TokenSummary | null;
  byAgent: AgentTokenUsage[];
  byModel: ModelTokenUsage[];
  daily: DailyUsage[];
  loading: boolean;
  error: string | null;

  fetchSummary: () => Promise<void>;
  fetchByAgent: () => Promise<void>;
  fetchByModel: () => Promise<void>;
  fetchDaily: (days?: number) => Promise<void>;
  fetchAll: () => Promise<void>;
  handleSSEEvent: (data: Record<string, unknown>) => void;
}

export const useTokenStore = create<TokenStore>()((set, get) => ({
  summary: null,
  byAgent: [],
  byModel: [],
  daily: [],
  loading: false,
  error: null,

  fetchSummary: async () => {
    try {
      const res = await fetch("/api/tokens/summary");
      if (!res.ok) return;
      const data = await res.json();
      set({ summary: data });
    } catch { /* silent */ }
  },

  fetchByAgent: async () => {
    try {
      const res = await fetch("/api/tokens/by-agent");
      if (!res.ok) return;
      const data = await res.json();
      set({ byAgent: Array.isArray(data) ? data : [] });
    } catch { /* silent */ }
  },

  fetchByModel: async () => {
    try {
      const res = await fetch("/api/tokens/by-model");
      if (!res.ok) return;
      const data = await res.json();
      set({ byModel: Array.isArray(data) ? data : [] });
    } catch { /* silent */ }
  },

  fetchDaily: async (days = 30) => {
    try {
      const res = await fetch(`/api/tokens/daily?days=${days}`);
      if (!res.ok) return;
      const data = await res.json();
      set({ daily: Array.isArray(data) ? data : [] });
    } catch { /* silent */ }
  },

  fetchAll: async () => {
    set({ loading: true });
    await Promise.all([
      get().fetchSummary(),
      get().fetchByAgent(),
      get().fetchByModel(),
      get().fetchDaily(),
    ]);
    set({ loading: false });
  },

  handleSSEEvent: (_data) => {
    // Refetch summary on token updates
    get().fetchSummary();
  },
}));
