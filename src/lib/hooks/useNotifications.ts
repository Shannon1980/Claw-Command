"use client";

import { useEffect, useRef } from "react";
import { useToasts } from "./useToasts";

interface Activity {
  id: string;
  type: string;
  title?: string;
  agentId?: string;
  agentName?: string;
  agentEmoji?: string;
  timestamp: string;
}

/**
 * Hook that polls the activities API and fires toasts for new events.
 * Call this once at the app root level.
 */
export function useNotifications(pollingInterval: number = 10000) {
  const { addToast } = useToasts();
  const seenActivityIds = useRef(new Set<string>());

  useEffect(() => {
    const checkForNewActivities = async () => {
      try {
        const response = await fetch("/api/activities?limit=20");
        if (!response.ok) return;

        const data = await response.json();
        const activities: Activity[] = data.activities || [];

        // Process new activities (reverse to show oldest first)
        activities.reverse().forEach((activity) => {
          if (seenActivityIds.current.has(activity.id)) return;

          seenActivityIds.current.add(activity.id);

          // Map activity types to toast notifications
          switch (activity.type) {
            case "approval_given":
              addToast({
                type: "success",
                title: "✅ Task approved",
                description: activity.title,
              });
              break;

            case "task_completed":
              addToast({
                type: "success",
                title: "Task completed",
                description: activity.agentName
                  ? `${activity.agentName}: ${activity.title || "Task completed"}`
                  : activity.title || "Task completed",
              });
              break;

            case "alert_fired":
              addToast({
                type: "warning",
                title: activity.title || "⚠️ New alert",
                description: "Check the alerts panel for details",
                duration: 8000, // Stay longer for alerts
              });
              break;

            case "approval_requested":
              addToast({
                type: "agent",
                title: `${activity.agentName || "Agent"} needs your approval`,
                description: activity.title,
                agentEmoji: activity.agentEmoji,
                agentName: activity.agentName,
                actionLabel: "View",
                onAction: () => {
                  // Navigate to approvals or relevant page
                  window.location.href = "/";
                },
                duration: 0, // Stay until dismissed
              });
              break;

            case "message_sent":
              // Don't show toasts for messages Shannon sent
              break;

            case "message_received":
              addToast({
                type: "agent",
                title: "New message",
                description: `From ${activity.agentName || "Agent"}`,
                agentEmoji: activity.agentEmoji,
                agentName: activity.agentName,
                actionLabel: "View",
                onAction: () => {
                  window.location.href = `/chat?agent=${activity.agentId}`;
                },
              });
              break;

            default:
              // Optionally log unhandled activity types
              // console.log("Unhandled activity type:", activity.type);
              break;
          }
        });
      } catch (error) {
        console.error("Error fetching activities for notifications:", error);
      }
    };

    // Initial check
    checkForNewActivities();

    // Set up polling
    const interval = setInterval(checkForNewActivities, pollingInterval);

    return () => clearInterval(interval);
  }, [addToast, pollingInterval]);
}
