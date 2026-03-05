"use client";

import { useEffect, useState } from "react";

interface LiveIndicatorProps {
  isOnline: boolean;
  lastRefresh?: Date | null;
  showPulse?: boolean;
}

export function LiveIndicator({
  isOnline,
  lastRefresh,
  showPulse = false,
}: LiveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    if (!lastRefresh) return;

    const updateTimeAgo = () => {
      const now = Date.now();
      const diff = Math.floor((now - lastRefresh.getTime()) / 1000);

      if (diff < 5) {
        setTimeAgo("just now");
      } else if (diff < 60) {
        setTimeAgo(`${diff}s ago`);
      } else if (diff < 3600) {
        setTimeAgo(`${Math.floor(diff / 60)}m ago`);
      } else {
        setTimeAgo(`${Math.floor(diff / 3600)}h ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 5000);

    return () => clearInterval(interval);
  }, [lastRefresh]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="relative flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            isOnline ? "bg-green-500" : "bg-red-500"
          } ${showPulse ? "animate-pulse" : ""}`}
        />
        {showPulse && (
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping" />
        )}
        <span
          className={`font-medium ${
            isOnline ? "text-green-600" : "text-red-600"
          }`}
        >
          {isOnline ? "LIVE" : "OFFLINE"}
        </span>
      </div>
      {lastRefresh && timeAgo && (
        <span className="text-gray-500 text-xs">· {timeAgo}</span>
      )}
    </div>
  );
}
