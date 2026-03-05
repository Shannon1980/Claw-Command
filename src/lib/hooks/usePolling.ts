"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UsePollingOptions {
  url: string;
  interval?: number; // milliseconds, default 15000 (15s)
  enabled?: boolean; // allow pausing, default true
}

interface UsePollingResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function usePolling<T = unknown>({
  url,
  interval = 15000,
  enabled = true,
}: UsePollingOptions): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [url]);

  useEffect(() => {
    if (!enabled) return;
    fetchData();
    const poll = () => {
      timeoutRef.current = setTimeout(() => {
        fetchData().then(poll);
      }, interval);
    };
    poll();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      isFetchingRef.current = false;
    };
  }, [url, interval, enabled, fetchData]);

  return { data, loading, error, refresh: fetchData };
}
