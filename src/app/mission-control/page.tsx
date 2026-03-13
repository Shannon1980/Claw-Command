"use client";

import "@/app/mission-control/mc-theme.css";
import MissionHeader from "@/dashboards/mission-control/components/MissionHeader";
import MC_KanbanBoard from "@/dashboards/mission-control/components/MC_KanbanBoard";
import MC_SchedulePanel from "@/dashboards/mission-control/components/MC_SchedulePanel";
import MC_MemoryRecall from "@/dashboards/mission-control/components/MC_MemoryRecall";
import MC_Dependencies from "@/dashboards/mission-control/components/MC_Dependencies";
import MC_SecurityPosture from "@/dashboards/mission-control/components/MC_SecurityPosture";
import MC_DecisionsPanel from "@/dashboards/mission-control/components/MC_DecisionsPanel";
import { useMemo } from "react";

export default function MissionControlPage() {
  const loadedAt = useMemo(() => new Date().toLocaleString(), []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <MissionHeader />
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-4 rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-xs text-gray-300">
          Dashboard loaded: <span className="font-mono text-gray-100">{loadedAt}</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <MC_KanbanBoard />
          </div>
          <div>
            <MC_SchedulePanel />
          </div>
          <div>
            <MC_MemoryRecall />
          </div>
          <div>
            <MC_SecurityPosture />
          </div>
          <div className="lg:col-span-2">
            <MC_DecisionsPanel />
          </div>
          <div className="lg:col-span-2">
            <MC_Dependencies />
          </div>
        </div>
      </main>
    </div>
  );
}
