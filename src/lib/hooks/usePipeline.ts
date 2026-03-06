"use client";

import { useState, useEffect, useCallback } from "react";
import type { Opportunity, Application } from "@/lib/mock-pipeline";

interface PipelineData {
  opportunities: Opportunity[];
  applications: Application[];
}

export function usePipeline() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [oppRes, appRes] = await Promise.all([
        fetch("/api/opportunities", { cache: "no-store" }),
        fetch("/api/applications", { cache: "no-store" }),
      ]);

      if (!oppRes.ok) throw new Error("Failed to fetch opportunities");
      if (!appRes.ok) throw new Error("Failed to fetch applications");

      const [oppData, appData] = await Promise.all([
        oppRes.json(),
        appRes.json(),
      ]);

      setOpportunities(oppData);
      setApplications(appData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateOpportunityStage = useCallback(
    async (id: string, stage: string) => {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (res.ok) {
        setOpportunities((prev) =>
          prev.map((o) => (o.id === id ? { ...o, stage } : o))
        );
      }
      return res.ok;
    },
    []
  );

  const updateApplicationStage = useCallback(
    async (id: string, stage: string) => {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) => (a.id === id ? { ...a, stage } : a))
        );
      }
      return res.ok;
    },
    []
  );

  return {
    opportunities,
    applications,
    loading,
    error,
    refresh: fetchAll,
    updateOpportunityStage,
    updateApplicationStage,
  };
}
