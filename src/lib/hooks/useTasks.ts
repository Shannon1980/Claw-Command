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
  agent_domain?: string;
}

export type TaskFilter = "all" | "my_approvals" | { agent: string };

function buildTasksUrl(filter: TaskFilter): string {
  const params = new URLSearchParams();
  if (filter === "all") {
    params.set("all", "true");
  } else if (filter === "my_approvals") {
    params.set("depends_on_shannon", "true");
  } else {
    params.set("agent", filter.agent);
  }
  return `/api/tasks?${params.toString()}`;
}

export function useTasks(dependsOnShannon = true) {
  const filter: TaskFilter = dependsOnShannon ? "my_approvals" : "all";
  const { data, loading, error, refresh } = usePolling<Task[]>({
    url: buildTasksUrl(filter),
    interval: 15000,
  });

  return {
    tasks: data || [],
    loading,
    error,
    refresh,
  };
}

export function useTasksWithFilter(filter: TaskFilter) {
  const { data, loading, error, refresh } = usePolling<Task[]>({
    url: buildTasksUrl(filter),
    interval: 15000,
  });

  return {
    tasks: data || [],
    loading,
    error,
    refresh,
  };
}
