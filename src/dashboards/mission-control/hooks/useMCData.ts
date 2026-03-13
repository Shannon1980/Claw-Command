"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Opportunity,
  TeachingTask,
  Blocker,
  Agent,
  ScheduleBlock,
  MemoryItem,
} from "@/lib/mission-control/mc_types";

type SecurityFinding = {
  code: string;
  severity: "info" | "warn" | "critical";
  message: string;
  fix?: string;
};

type GatewayStatusPayload = {
  security?: {
    ok: boolean;
    blockers: number;
    warnings: number;
    findings: SecurityFinding[];
  };
};

type DecisionItem = {
  id: string;
  title: string;
  choice: string;
  status: string;
  updated_at?: string;
};

const BASE = "/api/mission-control";

export function useMCOpportunities() {
  const [data, setData] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/opportunities`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { opportunities: data, loading, refresh: load };
}

export function useMCTeachingTasks() {
  const [data, setData] = useState<TeachingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/teaching-tasks`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { teachingTasks: data, loading, refresh: load };
}

export function useMCBlockers() {
  const [data, setData] = useState<Blocker[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/blockers`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { blockers: data, loading, refresh: load };
}

export function useMCAgents() {
  const [data, setData] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/agents`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { agents: data, loading, refresh: load };
}

export function useMCSchedule() {
  const [data, setData] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/schedule`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { schedule: data, loading, refresh: load };
}

export function useMCMemory() {
  const [data, setData] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/memory`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { memories: data, loading, refresh: load };
}

export function useMCSecurityPosture() {
  const [data, setData] = useState<GatewayStatusPayload["security"]>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/gateway/status`);
      const json = (await res.json()) as GatewayStatusPayload;
      setData(json.security);
    } catch {
      setData(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { security: data, loading, refresh: load };
}

export function useMCDecisions() {
  const [data, setData] = useState<DecisionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/decisions`);
      if (!res.ok) {
        setData([]);
        return;
      }

      const json = (await res.json()) as { items?: DecisionItem[] };
      setData(Array.isArray(json.items) ? json.items : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { decisions: data, loading, refresh: load };
}
