"use client";

import { useState, useEffect, useRef } from "react";
import { usePolling } from "./usePolling";

export interface Activity {
  id: string;
  actor_agent_id: string | null;
  event_type: string;
  resource_type: string;
  resource_id: string;
  details: string;
  created_at: string;
  actor_name?: string;
  actor_emoji?: string;
}

export function useActivities(limit = 20) {
  const { data, loading, error, refresh } = usePolling<Activity[]>({
    url: `/api/activities?limit=${limit}`,
    interval: 10000, // 10 seconds
  });

  const [hasNewActivity, setHasNewActivity] = useState(false);
  const previousCountRef = useRef(0);

  // Detect new activities and trigger pulse
  useEffect(() => {
    if (data && data.length > 0) {
      const currentCount = data.length;
      
      // Check if we have more activities than before (new activity arrived)
      if (previousCountRef.current > 0 && currentCount > previousCountRef.current) {
        setHasNewActivity(true);
        
        // Reset pulse after animation duration
        setTimeout(() => {
          setHasNewActivity(false);
        }, 2000);
      }
      
      previousCountRef.current = currentCount;
    }
  }, [data]);

  return {
    activities: data || [],
    loading,
    error,
    refresh,
    hasNewActivity, // Consumers can use this to trigger pulse animations
  };
}
