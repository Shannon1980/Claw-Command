"use client";

import { create } from "zustand";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  id: string;
  agentId: string | null;
  agentName?: string;
  agentEmoji?: string;
  sessionId: string | null;
  level: LogLevel;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface LogFilters {
  agentId?: string;
  level?: LogLevel;
  search?: string;
}

interface LogStore {
  entries: LogEntry[];
  filters: LogFilters;
  paused: boolean;
  maxEntries: number;
  loading: boolean;

  fetchLogs: (limit?: number) => Promise<void>;
  setFilters: (filters: Partial<LogFilters>) => void;
  addEntry: (entry: LogEntry) => void;
  togglePause: () => void;
  clear: () => void;
  handleSSEEvent: (data: Record<string, unknown>) => void;
  filteredEntries: () => LogEntry[];
}

export const useLogStore = create<LogStore>()((set, get) => ({
  entries: [],
  filters: {},
  paused: false,
  maxEntries: 5000,
  loading: false,

  fetchLogs: async (limit = 200) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      const { filters } = get();
      if (filters.agentId) params.set("agent", filters.agentId);
      if (filters.level) params.set("level", filters.level);
      const res = await fetch(`/api/logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      set({ entries: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  addEntry: (entry) => {
    if (get().paused) return;
    set((state) => {
      const entries = [entry, ...state.entries];
      if (entries.length > state.maxEntries) entries.length = state.maxEntries;
      return { entries };
    });
  },

  togglePause: () => set((state) => ({ paused: !state.paused })),

  clear: () => set({ entries: [] }),

  handleSSEEvent: (data) => {
    get().addEntry({
      id: (data.id as string) || `log-${Date.now()}`,
      agentId: (data.agentId as string) || null,
      agentName: data.agentName as string,
      agentEmoji: data.agentEmoji as string,
      sessionId: (data.sessionId as string) || null,
      level: (data.level as LogLevel) || "info",
      message: (data.message as string) || "",
      metadata: (data.metadata as Record<string, unknown>) || {},
      createdAt: (data.createdAt as string) || new Date().toISOString(),
    });
  },

  filteredEntries: () => {
    const { entries, filters } = get();
    return entries.filter((e) => {
      if (filters.agentId && e.agentId !== filters.agentId) return false;
      if (filters.level && e.level !== filters.level) return false;
      if (
        filters.search &&
        !e.message.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      return true;
    });
  },
}));
