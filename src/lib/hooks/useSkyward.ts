"use client";

import { usePolling } from "./usePolling";

export interface SkywardTask {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  depends_on_shannon: boolean;
  agent_name: string;
  agent_emoji: string;
}

export interface KeyUpdate {
  id: string;
  content: string;
  timestamp: string;
}

export interface WorkstreamTask extends SkywardTask {}

export interface SkywardWorkstream {
  id: string;
  name: string;
  status: string;
  description: string;
  owner: string;
  milestones: Array<{ id: string; name: string; date: string; completed: boolean }>;
  riskFactors: string[];
  tasks: WorkstreamTask[];
  updatedAt: string;
}

export interface SkywardData {
  workstreams: SkywardWorkstream[];
  actionItemsForShannon: SkywardTask[];
  keyUpdates: KeyUpdate[];
  timestamp: string;
}

export function useSkyward() {
  const { data, loading, error, refresh } = usePolling<SkywardData>({
    url: "/api/skyward",
    interval: 15000,
  });

  return {
    data: data || {
      workstreams: [],
      actionItemsForShannon: [],
      keyUpdates: [],
      timestamp: new Date().toISOString(),
    },
    loading,
    error,
    refresh,
  };
}
