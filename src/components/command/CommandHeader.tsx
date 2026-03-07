"use client";

import { useEffect, useState } from "react";
import { LiveIndicator } from "./LiveIndicator";
import { useAgentStore } from "@/lib/stores/agentStore";
import ActivityFlyout from "./ActivityFlyout";

export default function CommandHeader() {
  const [time, setTime] = useState<string>("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const agents = useAgentStore((s) => s.agents);
  const error = useAgentStore((s) => s.error);

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZoneName: "short",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update lastRefresh when agents data changes
  useEffect(() => {
    if (agents && agents.length > 0) {
      setLastRefresh(new Date());
    }
  }, [agents]);

  return (
    <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-bold text-black">
            CC
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-100">
              CLAW COMMAND
            </h1>
            <p className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">
              Vorentoe Mission Control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <ActivityFlyout />
          <LiveIndicator
            isOnline={!error}
            lastRefresh={lastRefresh}
            showPulse={false}
          />
          <span className="text-sm font-mono text-gray-400 tabular-nums">
            {time}
          </span>
        </div>
      </div>
    </header>
  );
}
