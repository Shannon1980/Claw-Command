"use client";

import { usePolling } from "./usePolling";

export interface Task {
  id: string;
  title: string;
  assigned_to_agent_id: string;
  depends_on_shannon: boolean;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  agent_name?: string;
  agent_emoji?: string;
}

export function useTasks(dependsOnShannon = true) {
  const { data, loading, error, refresh } = usePolling<Task[]>({
    url: `/api/tasks?depends_on_shannon=${dependsOnShannon}`,
    interval: 15000, // 15 seconds
  });

  return {
    tasks: data || [],
    loading,
    error,
    refresh,
  };
}
