"use client";

import { useBackgroundSync } from "@/lib/hooks/useBackgroundSync";

/**
 * Renders nothing. Triggers background sync (agents + tasks) from OpenClaw every 30s.
 */
export default function SyncTrigger() {
  useBackgroundSync();
  return null;
}
