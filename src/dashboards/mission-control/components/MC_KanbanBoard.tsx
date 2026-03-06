"use client";

import { useMCTeachingTasks } from "../hooks/useMCData";

const LANES = [
  { id: "backlog", label: "Backlog", statuses: ["backlog"] },
  { id: "ready", label: "Ready", statuses: ["ready"] },
  { id: "in_progress", label: "In Progress", statuses: ["in_progress"] },
  { id: "review", label: "Review", statuses: ["review"] },
  { id: "done", label: "Done", statuses: ["done"] },
];

export default function MC_KanbanBoard() {
  const { teachingTasks, loading } = useMCTeachingTasks();

  return (
    <div className="mc-panel p-4">
      <h2 className="mc-panel-header text-sm font-semibold text-gray-300 mb-4">
        Kanban Board
      </h2>
      {loading ? (
        <div className="h-32 animate-pulse bg-gray-800/50 rounded" />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {LANES.map((lane) => {
            const items = teachingTasks.filter((t) =>
              lane.statuses.includes(t.status)
            );
            return (
              <div
                key={lane.id}
                className="mc-lane min-w-[180px] flex-shrink-0 p-3"
              >
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {lane.label}
                </div>
                <div className="space-y-2">
                  {items.map((task) => (
                    <div
                      key={task.id}
                      className="mc-card p-2 text-sm text-gray-200"
                    >
                      {task.title}
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-xs text-gray-600 italic">Empty</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
