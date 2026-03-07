"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

const EMPTY_DATA: SkywardData = {
  workstreams: [],
  actionItemsForShannon: [],
  keyUpdates: [],
  timestamp: new Date().toISOString(),
};

export function useSkyward() {
  const [data, setData] = useState<SkywardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/skyward");
      if (!res.ok) throw new Error("Failed to fetch skyward data");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}
