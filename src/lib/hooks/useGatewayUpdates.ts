"use client";

import { useEffect, useRef, useCallback } from "react";
import { useGatewayContext } from "@/lib/contexts/GatewayContext";
import type { GatewayEvent } from "@/lib/gateway/types";

type UseGatewayUpdatesOptions = {
  enabled?: boolean;
  pollingInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
};

/**
 * Hook to subscribe to real-time updates from OpenClaw gateway
 * Automatically handles SSE + fallback to polling
 * Includes exponential backoff and automatic reconnection
 */
export function useGatewayUpdates(options: UseGatewayUpdatesOptions = {}) {
  const {
    enabled = true,
    pollingInterval = 5000,
    maxRetries = Infinity,
    retryDelay = 1000,
  } = options;

  const gateway = useGatewayContext();
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retriesRef = useRef(0);
  const currentDelayRef = useRef(retryDelay);
  const mountedRef = useRef(true);

  // ─── Event Handler ──────────────────────────────────────────────────

  const handleEvent = useCallback(
    (event: GatewayEvent) => {
      if (!mountedRef.current) return;

      switch (event.type) {
        case "agent_status_changed":
          gateway.updateAgentStatus(event.agentId, event.status);
          break;

        case "subagent_progress":
          gateway.updateSubagentProgress(event.taskId, event.progress);
          break;

        case "task_queued":
          gateway.addQueueItem(event.task);
          break;

        case "task_completed":
          gateway.removeQueueItem(event.taskId);
          break;

        case "metrics_updated":
          gateway.updateMetrics(event.metrics);
          break;

        case "initial_state":
          // Set initial agent statuses
          Object.entries(event.state.agents).forEach(([agentId, status]) => {
            gateway.updateAgentStatus(agentId, status);
          });
          // Set initial task queue
          event.state.tasks.forEach((task) => gateway.addQueueItem(task));
          // Set initial metrics
          gateway.updateMetrics(event.state.metrics);
          break;

        case "connection_status":
          gateway.setConnectionStatus(event.status, event.error);
          break;
      }
    },
    [gateway]
  );

  // ─── SSE Connection ─────────────────────────────────────────────────

  const connectSSE = useCallback(() => {
    if (!mountedRef.current) return;

    gateway.setConnectionStatus("reconnecting");

    try {
      const eventSource = new EventSource("/api/gateway/subscribe");

      eventSource.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data) as GatewayEvent;
          handleEvent(data);
          gateway.setConnectionStatus("connected");
          retriesRef.current = 0;
          currentDelayRef.current = retryDelay;
        } catch (err) {
          console.error("[Gateway] Failed to parse event:", err, event.data);
        }
      });

      eventSource.addEventListener("error", () => {
        if (!mountedRef.current) return;

        eventSource.close();
        eventSourceRef.current = null;

        if (retriesRef.current < maxRetries) {
          retriesRef.current++;
          gateway.setConnectionStatus("reconnecting");

          // Exponential backoff
          const delay = Math.min(currentDelayRef.current * 1.5, 30000);
          currentDelayRef.current = delay;

          pollTimerRef.current = setTimeout(
            () => {
              if (mountedRef.current) connectSSE();
            },
            Math.random() * delay
          );
        } else {
          gateway.setConnectionStatus("disconnected", {
            code: "SSE_CONNECTION_FAILED",
            message: "Failed to connect after max retries",
          });
          // Fallback to polling
          startPolling();
        }
      });

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error("[Gateway] SSE connection error:", err);
      gateway.setConnectionStatus("error", {
        code: "SSE_ERROR",
        message: err instanceof Error ? err.message : "SSE connection error",
      });
      // Fallback to polling
      if (mountedRef.current) startPolling();
    }
  }, [gateway, handleEvent, maxRetries, retryDelay]);

  // ─── Polling Fallback ───────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const res = await fetch("/api/gateway/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      // Transform response into events
      if (data.agents) {
        Object.entries(data.agents).forEach(([agentId, status]) => {
          handleEvent({
            type: "agent_status_changed",
            agentId,
            status: status as any,
            timestamp: new Date().toISOString(),
          });
        });
      }

      if (data.tasks) {
        data.tasks.forEach((task: any) => {
          handleEvent({
            type: "task_queued",
            task,
          });
        });
      }

      if (data.metrics) {
        handleEvent({
          type: "metrics_updated",
          metrics: data.metrics,
        });
      }

      gateway.setConnectionStatus("connected");
      retriesRef.current = 0;
    } catch (err) {
      console.error("[Gateway] Polling error:", err);
      retriesRef.current++;

      if (retriesRef.current >= maxRetries) {
        gateway.setConnectionStatus("disconnected", {
          code: "POLLING_FAILED",
          message: err instanceof Error ? err.message : "Polling failed",
        });
      }
    }
  }, [gateway, handleEvent, maxRetries]);

  const startPolling = useCallback(() => {
    if (!mountedRef.current) return;

    fetchStatus();
    pollTimerRef.current = setInterval(fetchStatus, pollingInterval);
  }, [fetchStatus, pollingInterval]);

  // ─── Lifecycle ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled) return;

    mountedRef.current = true;

    // Try SSE first, fallback to polling automatically
    connectSSE();

    return () => {
      mountedRef.current = false;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [enabled, connectSSE, startPolling]);

  return {
    isConnected: gateway.isConnected,
    connection: gateway.state.connection,
    error: gateway.state.error,
  };
}
