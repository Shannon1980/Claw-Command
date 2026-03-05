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
        const domains = getDomainStatuses();
        const priorities = getPriorities();
        setData({
          summary: getOvernightSummary(),
          domains: domainFilter
            ? domains.filter(
                (d) =>
                  d.name.toLowerCase() === domainFilter.toLowerCase() ||
                  d.name.toLowerCase().includes(domainFilter.toLowerCase())
              )
            : domains,
          priorities: domainFilter
            ? priorities.filter(
                (p) =>
                  p.domain.toLowerCase() === domainFilter.toLowerCase() ||
                  p.domain.toLowerCase().includes(domainFilter.toLowerCase())
              )
            : priorities,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load brief");
      const domains = getDomainStatuses();
      const priorities = getPriorities();
      setData({
        summary: getOvernightSummary(),
        domains: domainFilter
          ? domains.filter(
              (d) =>
                d.name.toLowerCase() === domainFilter.toLowerCase() ||
                d.name.toLowerCase().includes(domainFilter.toLowerCase())
            )
          : domains,
        priorities: domainFilter
          ? priorities.filter(
              (p) =>
                p.domain.toLowerCase() === domainFilter.toLowerCase() ||
                p.domain.toLowerCase().includes(domainFilter.toLowerCase())
            )
          : priorities,
      });
    } finally {
      setLoading(false);
    }
  }, [domainFilter]);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  return { data, loading, error, refresh: fetchBrief };
}
