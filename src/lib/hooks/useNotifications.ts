"use client";

import { useEffect, useRef } from "react";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import { useToasts } from "./useToasts";

/**
 * Subscribes to the notification store (fed by SSE) and fires toast
 * notifications for new items. No polling required — the SSE event
 * stream pushes events to the store in real time.
 */
export function useNotifications() {
  const { addToast } = useToasts();
  const seenIds = useRef(new Set<string>());
  const notifications = useNotificationStore((s) => s.notifications);

  useEffect(() => {
    for (const notif of notifications) {
      if (seenIds.current.has(notif.id)) continue;
      seenIds.current.add(notif.id);

      if (notif.readAt) continue;

      const type = notif.type;
      if (type === "alert" || type === "alert_fired") {
        addToast({
          type: "warning",
          title: notif.title || "New alert",
          description: notif.body,
          duration: 8000,
        });
      } else if (type === "approval_requested") {
        addToast({
          type: "agent",
          title: notif.title || "Approval needed",
          description: notif.body,
          actionLabel: "View",
          onAction: () => {
            if (notif.resourceUrl) window.location.href = notif.resourceUrl;
          },
          duration: 0,
        });
      } else if (type === "success" || type === "task_completed" || type === "approval_given") {
        addToast({
          type: "success",
          title: notif.title || "Completed",
          description: notif.body,
        });
      } else if (type === "message_received") {
        addToast({
          type: "agent",
          title: notif.title || "New message",
          description: notif.body,
          actionLabel: "View",
          onAction: () => {
            if (notif.resourceUrl) window.location.href = notif.resourceUrl;
          },
        });
      }
    }
  }, [notifications, addToast]);
}
