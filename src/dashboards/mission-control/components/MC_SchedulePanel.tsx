"use client";

import { useMCSchedule } from "../hooks/useMCData";

export default function MC_SchedulePanel() {
  const { schedule, loading } = useMCSchedule();

  return (
    <div className="mc-panel p-4">
      <h2 className="mc-panel-header text-sm font-semibold text-gray-300 mb-4">
        Schedule
      </h2>
      {loading ? (
        <div className="h-40 animate-pulse bg-gray-800/50 rounded" />
      ) : (
        <div className="space-y-2">
          {schedule.length === 0 ? (
            <div className="text-sm text-gray-500 italic">No schedule blocks</div>
          ) : (
            schedule.map((block) => (
              <div
                key={block.id}
                className="mc-card flex justify-between items-center p-2 text-sm"
              >
                <span className="text-gray-200">{block.title}</span>
                <span className="text-gray-500 text-xs">
                  {new Date(block.start).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  –
                  {new Date(block.end).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
