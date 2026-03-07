"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAgentStore } from "@/lib/stores/agentStore";
import { useTaskStore } from "@/lib/stores/taskStore";
import { useSessionStore } from "@/lib/stores/sessionStore";
import { useLogStore } from "@/lib/stores/logStore";
import { useTokenStore } from "@/lib/stores/tokenStore";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import { usePipelineStore } from "@/lib/stores/pipelineStore";
import { useOverviewStore } from "@/lib/stores/overviewStore";
import { useChatStore } from "@/lib/stores/chatStore";

const EVENT_HANDLERS: Record<
  string,
  (data: Record<string, unknown>) => void
> = {};

function getHandlers() {
  // Lazily bind store handlers to avoid calling hooks at module level
  if (Object.keys(EVENT_HANDLERS).length === 0) {
    EVENT_HANDLERS.agent_status = (d) =>
      useAgentStore.getState().handleSSEEvent(d);
    EVENT_HANDLERS.task_update = (d) =>
      useTaskStore.getState().handleSSEEvent(d);
    EVENT_HANDLERS.session_event = (d) =>
      useSessionStore.getState().handleSSEEvent(d);
    EVENT_HANDLERS.log_entry = (d) =>
      useLogStore.getState().handleSSEEvent(d);
    EVENT_HANDLERS.token_update = (d) =>
      useTokenStore.getState().handleSSEEvent(d);
    EVENT_HANDLERS.notification = (d) =>
      useNotificationStore.getState().handleSSEEvent(d);
    EVENT_HANDLERS.pipeline_progress = (d) =>
      usePipelineStore.getState().handleSSEEvent(d);
    EVENT_HANDLERS.system_health = (d) =>
      useOverviewStore.getState().handleSSEEvent(d);
    EVENT_HANDLERS.alert_fired = (d) =>
      useNotificationStore.getState().handleSSEEvent({
        ...d,
        type: "alert",
        title: (d.title as string) || "Alert fired",
      });
    EVENT_HANDLERS.chat_message = (d) =>
      useChatStore.getState().handleSSEEvent(d);
  }
  return EVENT_HANDLERS;
}

export function useEventStream() {
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventId = useRef<string>("");
  const retryCount = useRef(0);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const url = lastEventId.current
      ? `/api/sse/feed?lastEventId=${encodeURIComponent(lastEventId.current)}`
      : "/api/sse/feed";

    const es = new EventSource(url);
    esRef.current = es;

    const handlers = getHandlers();

    // Listen for all known event types
    const eventTypes = [
      "agent_status",
      "task_update",
      "session_event",
      "log_entry",
      "token_update",
      "notification",
      "pipeline_progress",
      "system_health",
      "alert_fired",
      "chat_message",
    ];

    for (const type of eventTypes) {
      es.addEventListener(type, (event: MessageEvent) => {
        try {
          lastEventId.current = (event as MessageEvent & { lastEventId?: string }).lastEventId || "";
          const data = JSON.parse(event.data);
          const handler = handlers[type];
          if (handler) handler(data);
        } catch {
          // ignore parse errors
        }
      });
    }

    es.addEventListener("connected", () => {
      retryCount.current = 0;
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
      retryCount.current++;
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (esRef.current) esRef.current.close();
    };
  }, [connect]);
}
