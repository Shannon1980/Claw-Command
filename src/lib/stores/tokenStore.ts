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

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

interface TokenStore {
  summary: TokenSummary | null;
  byAgent: AgentTokenUsage[];
  byModel: ModelTokenUsage[];
  daily: DailyUsage[];
  loading: boolean;
  error: string | null;
  dateRange: DateRange | null;

  setDateRange: (range: DateRange | null) => void;
  fetchSummary: () => Promise<void>;
  fetchByAgent: () => Promise<void>;
  fetchByModel: () => Promise<void>;
  fetchDaily: (days?: number) => Promise<void>;
  fetchAll: (overrideRange?: DateRange | null) => Promise<void>;
  handleSSEEvent: (data: Record<string, unknown>) => void;
}

function buildDateParams(range: DateRange | null): string {
  if (!range) return "";
  const params = new URLSearchParams();
  params.set("from", range.from);
  params.set("to", range.to);
  return params.toString();
}

function defaultDateRange(): DateRange {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const d = new Date(now);
  d.setDate(d.getDate() - 30);
  const from = d.toISOString().slice(0, 10);
  return { from, to };
}

export const useTokenStore = create<TokenStore>()((set, get) => ({
  summary: null,
  byAgent: [],
  byModel: [],
  daily: [],
  loading: false,
  error: null,
  dateRange: defaultDateRange(),

  setDateRange: (range) => set({ dateRange: range }),

  fetchSummary: async () => {
    try {
      const params = buildDateParams(get().dateRange);
      const res = await fetch(`/api/tokens/summary${params ? `?${params}` : ""}`);
      if (!res.ok) {
        set({ error: `Failed to fetch token summary (${res.status})` });
        return;
      }
      const data = await res.json();
      set({ summary: data, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to fetch token summary" });
    }
  },

  fetchByAgent: async () => {
    try {
      const params = buildDateParams(get().dateRange);
      const res = await fetch(`/api/tokens/by-agent${params ? `?${params}` : ""}`);
      if (!res.ok) return;
      const data = await res.json();
      set({ byAgent: Array.isArray(data) ? data : [] });
    } catch { /* non-critical */ }
  },

  fetchByModel: async () => {
    try {
      const params = buildDateParams(get().dateRange);
      const res = await fetch(`/api/tokens/by-model${params ? `?${params}` : ""}`);
      if (!res.ok) return;
      const data = await res.json();
      set({ byModel: Array.isArray(data) ? data : [] });
    } catch { /* non-critical */ }
  },

  fetchDaily: async (days = 30) => {
    try {
      const range = get().dateRange;
      let url = "/api/tokens/daily";
      if (range) {
        url += `?from=${range.from}&to=${range.to}`;
      } else {
        url += `?days=${days}`;
      }
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      set({ daily: Array.isArray(data) ? data : [] });
    } catch { /* non-critical */ }
  },

  fetchAll: async (overrideRange?: DateRange | null) => {
    const range = overrideRange !== undefined ? overrideRange : get().dateRange;
    set({ loading: true });
    try {
      const params = buildDateParams(range);
      const qs = params ? `?${params}` : "";
      let dailyUrl = "/api/tokens/daily";
      if (range) {
        dailyUrl += `?from=${range.from}&to=${range.to}`;
      } else {
        dailyUrl += "?days=30";
      }

      const [summaryRes, agentRes, modelRes, dailyRes] = await Promise.all([
        fetch(`/api/tokens/summary${qs}`),
        fetch(`/api/tokens/by-agent${qs}`),
        fetch(`/api/tokens/by-model${qs}`),
        fetch(dailyUrl),
      ]);

      if (summaryRes.ok) set({ summary: await summaryRes.json() });
      if (agentRes.ok) {
        const data = await agentRes.json();
        set({ byAgent: Array.isArray(data) ? data : [] });
      }
      if (modelRes.ok) {
        const data = await modelRes.json();
        set({ byModel: Array.isArray(data) ? data : [] });
      }
      if (dailyRes.ok) {
        const data = await dailyRes.json();
        set({ daily: Array.isArray(data) ? data : [] });
      }
    } finally {
      set({ loading: false });
    }
  },

  handleSSEEvent: (_data) => {
    // Refetch summary on token updates
    get().fetchSummary();
  },
}));
