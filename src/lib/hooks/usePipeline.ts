"use client";

import { useState, useEffect, useCallback } from "react";
import type { Opportunity, Application } from "@/lib/pipeline/types";

export function usePipeline() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      const [oppRes, appRes] = await Promise.all([
        fetch("/api/opportunities", { cache: "no-store" }),
        fetch("/api/applications", { cache: "no-store" }),
      ]);

      if (!oppRes.ok) throw new Error("Failed to fetch opportunities");
      if (!appRes.ok) throw new Error("Failed to fetch applications");

      const [oppData, appData] = await Promise.all([oppRes.json(), appRes.json()]);

      setOpportunities(oppData);
      setApplications(appData);
      setLastUpdated(new Date().toISOString());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAll({ silent: true });
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const updateOpportunityStage = useCallback(async (id: string, stage: string) => {
    const res = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (res.ok) {
      setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, stage } : o)));
      setLastUpdated(new Date().toISOString());
    }
    return res.ok;
  }, []);

  const updateApplicationStage = useCallback(async (id: string, stage: string) => {
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (res.ok) {
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, stage } : a)));
      setLastUpdated(new Date().toISOString());
    }
    return res.ok;
  }, []);

  const passOpportunity = useCallback(async (id: string) => {
    const res = await fetch(`/api/opportunities/${id}/pass`, {
      method: "POST",
    });
    if (res.ok) {
      setOpportunities((prev) => prev.filter((o) => o.id !== id));
      setLastUpdated(new Date().toISOString());
    }
    return res.ok;
  }, []);

  return {
    opportunities,
    applications,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh: () => fetchAll({ silent: true }),
    updateOpportunityStage,
    updateApplicationStage,
    passOpportunity,
  };
}
