"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  OvernightSummary,
  DomainStatus,
  Priority,
} from "@/lib/mock-brief";
import {
  getOvernightSummary,
  getDomainStatuses,
  getPriorities,
} from "@/lib/mock-brief";

export type BriefData = {
  summary: OvernightSummary;
  domains: DomainStatus[];
  priorities: Priority[];
};

export function useBrief() {
  const [data, setData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brief");
      if (res.ok) {
        const json = await res.json();
        setData({
          summary: json.summary,
          domains: json.domains,
          priorities: json.priorities,
        });
      } else {
        // Fallback to mock when DB not configured (503) or other error
        setData({
          summary: getOvernightSummary(),
          domains: getDomainStatuses(),
          priorities: getPriorities(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load brief");
      setData({
        summary: getOvernightSummary(),
        domains: getDomainStatuses(),
        priorities: getPriorities(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  return { data, loading, error, refresh: fetchBrief };
}
