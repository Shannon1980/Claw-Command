"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DashboardQueue } from "@/lib/opportunity-engine/types";

const EMPTY_QUEUE: DashboardQueue = {
  captureNowDirect: [],
  captureNowTeamSkyward: [],
  captureNowTeamVorentoe: [],
  watch: [],
  pass: [],
  lastScanAt: new Date().toISOString(),
  totalScanned: 0,
};

export interface ScanResult {
  success: boolean;
  totalInserted: number;
  scannedAt: string;
  message?: string;
}

export function useOpportunityEngine() {
  const [queue, setQueue] = useState<DashboardQueue>(EMPTY_QUEUE);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/opportunity-engine");
      if (!res.ok) throw new Error("Failed to fetch opportunity engine data");
      const data = await res.json();
      setQueue(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerScan = useCallback(async () => {
    setScanning(true);
    setLastScanResult(null);
    try {
      const res = await fetch("/api/opportunity-engine/scan", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Scan failed");
      }
      const scanData = await res.json();
      setLastScanResult(scanData);
      await refresh();
    } catch (err) {
      setError(err as Error);
    } finally {
      setScanning(false);
    }
  }, [refresh]);

  const dismissScanResult = useCallback(() => {
    setLastScanResult(null);
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return { queue, loading, scanning, error, lastScanResult, refresh, triggerScan, dismissScanResult };
}
