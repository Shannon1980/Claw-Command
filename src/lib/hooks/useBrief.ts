"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  OvernightSummary,
  DomainStatus,
  Priority,
} from "@/lib/mock-brief";

export type BriefData = {
  summary: OvernightSummary;
  domains: DomainStatus[];
  priorities: Priority[];
};

const EMPTY_BRIEF: BriefData = {
  summary: { tasksCompleted: 0, newAlerts: 0, pendingApprovals: 0 },
  domains: [],
  priorities: [],
};

export function useBrief(domainFilter?: string) {
  const [data, setData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = domainFilter
        ? `/api/brief?domain=${encodeURIComponent(domainFilter)}`
        : "/api/brief";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData({
          summary: json.summary,
          domains: json.domains,
          priorities: json.priorities,
        });
      } else {
        setData(EMPTY_BRIEF);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load brief");
      setData(EMPTY_BRIEF);
    } finally {
      setLoading(false);
    }
  }, [domainFilter]);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  return { data, loading, error, refresh: fetchBrief };
}
