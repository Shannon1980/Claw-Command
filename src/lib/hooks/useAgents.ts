"use client";

import { usePolling } from "./usePolling";

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  domain: string;
  status: string;
  current_task_id: string | null;
  updated_at: string;
}

export function useAgents() {
  const { data, loading, error, refresh } = usePolling<Agent[]>({
    url: "/api/agents",
    interval: 15000, // 15 seconds
  });

  return {
    agents: data || [],
    loading,
    error,
    refresh,
  };
}
