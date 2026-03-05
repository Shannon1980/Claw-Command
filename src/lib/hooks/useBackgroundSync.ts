"use client";

import { useEffect, useRef } from "react";

const SYNC_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Triggers periodic sync from OpenClaw (agents + tasks) to the database.
 * Runs on mount and every 30s while the app is active.
 */
export function useBackgroundSync() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sync = async () => {
      try {
        await fetch("/api/sync", { method: "POST" });
      } catch {
        // Silently ignore - gateway may be offline
      }
    };

    // Initial sync
    sync();

    // Periodic sync
    intervalRef.current = setInterval(sync, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);
}
