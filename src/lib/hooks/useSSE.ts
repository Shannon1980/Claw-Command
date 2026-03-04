"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface SSEState {
  connected: boolean;
  lastEvent: unknown | null;
  events: Array<{ type: string; data: unknown; timestamp: string }>;
  error: string | null;
}

export function useSSE(url: string = "/api/sse/feed") {
  const [state, setState] = useState<SSEState>({
    connected: false,
    lastEvent: null,
    events: [],
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener("connected", (e) => {
        setState((prev) => ({ ...prev, connected: true, error: null }));
        // Clear fallback polling if SSE is working
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
          fallbackIntervalRef.current = null;
        }
      });

      es.addEventListener("agent_update", (e) => {
        const data = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          lastEvent: data,
          events: [
            { type: "agent_update", data, timestamp: new Date().toISOString() },
            ...prev.events.slice(0, 99), // Keep last 100
          ],
        }));
      });

      es.addEventListener("new_activity", (e) => {
        const data = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          lastEvent: data,
          events: [
            { type: "new_activity", data, timestamp: new Date().toISOString() },
            ...prev.events.slice(0, 99),
          ],
        }));
      });

      es.addEventListener("new_alert", (e) => {
        const data = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          lastEvent: data,
          events: [
            { type: "new_alert", data, timestamp: new Date().toISOString() },
            ...prev.events.slice(0, 99),
          ],
        }));
      });

      es.addEventListener("sync_complete", (e) => {
        const data = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          lastEvent: data,
          events: [
            {
              type: "sync_complete",
              data,
              timestamp: new Date().toISOString(),
            },
            ...prev.events.slice(0, 99),
          ],
        }));
      });

      es.onerror = () => {
        setState((prev) => ({
          ...prev,
          connected: false,
          error: "SSE connection lost. Reconnecting...",
        }));
        es.close();

        // Reconnect with backoff
        reconnectTimeoutRef.current = setTimeout(connect, 5000);

        // Start fallback polling
        if (!fallbackIntervalRef.current) {
          fallbackIntervalRef.current = setInterval(async () => {
            try {
              const res = await fetch("/api/agents");
              if (res.ok) {
                const data = await res.json();
                setState((prev) => ({ ...prev, lastEvent: data }));
              }
            } catch {
              // Polling failed, will retry
            }
          }, 10000);
        }
      };
    } catch {
      setState((prev) => ({
        ...prev,
        connected: false,
        error: "Failed to connect to SSE feed",
      }));
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (fallbackIntervalRef.current)
        clearInterval(fallbackIntervalRef.current);
    };
  }, [connect]);

  return state;
}
