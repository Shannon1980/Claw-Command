"use client";

import { create } from "zustand";

export interface SystemHealth {
  gatewayStatus: "online" | "offline" | "unknown";
  gatewayLatencyMs: number | null;
  dbSizeMb: number | null;
  uptime: string | null;
  errorCount24h: number;
}

export interface OverviewStats {
  activeSessions: number;
  totalSessions: number;
  agentsOnline: number;
  totalAgents: number;
  tasksRunning: number;
  totalTasks: number;
  errors24h: number;
  auditEvents24h: number;
  auditEvents7d: number;
  webhooksConfigured: number;
  unreadNotifications: number;
  tasksByStatus: Record<string, number>;
}

interface OverviewStore {
  stats: OverviewStats | null;
  health: SystemHealth | null;
  loading: boolean;
  error: string | null;

  fetchStats: () => Promise<void>;
  fetchHealth: () => Promise<void>;
  handleSSEEvent: (data: Record<string, unknown>) => void;
}

export const useOverviewStore = create<OverviewStore>()((set) => ({
  stats: null,
  health: null,
  loading: false,
  error: null,

  fetchStats: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/overview/stats");
      if (!res.ok) throw new Error("Failed to fetch overview stats");
      const data = await res.json();
      set({ stats: data, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchHealth: async () => {
    try {
      const res = await fetch("/api/gateway/status");
      if (!res.ok) throw new Error("Failed to fetch health");
      const data = await res.json();
      set({
        health: {
          gatewayStatus: data.connected ? "online" : "offline",
          gatewayLatencyMs: data.latencyMs ?? null,
          dbSizeMb: data.dbSizeMb ?? null,
          uptime: data.uptime ?? null,
          errorCount24h: data.errorCount24h ?? 0,
        },
      });
    } catch {
      set({
        health: {
          gatewayStatus: "offline",
          gatewayLatencyMs: null,
          dbSizeMb: null,
          uptime: null,
          errorCount24h: 0,
        },
      });
    }
  },

  handleSSEEvent: (data) => {
    set((state) => ({
      health: state.health
        ? { ...state.health, ...(data as Partial<SystemHealth>) }
        : null,
    }));
  },
}));
