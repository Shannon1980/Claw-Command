"use client";

import type { Task } from "@/lib/hooks/useTasks";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  backlog: "border-gray-600",
  ready: "border-cyan-500/50",
  in_progress: "border-blue-500/50",
  blocked: "border-amber-500/50",
  done: "border-green-500/50",
};
const PRIORITY_LABELS: Record<string, string> = {
  high: "🔴 High",
  medium: "🟡 Medium",
  low: "🟢 Low",
};

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const statusColor = STATUS_COLORS[task.status] || "border-gray-600";

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      onClick={onClick}
      className={`bg-gray-900/80 border-l-4 ${statusColor} border border-gray-800 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-gray-600 transition-all`}
    >
      <h4 className="text-sm font-medium text-gray-200 leading-tight mb-2">
        {task.title}
      </h4>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-gray-400">
          {task.agent_emoji ?? "👤"} {task.agent_name ?? "Shannon"}
        </span>
        {(task.priority === "high" || task.priority === "low") && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
            {PRIORITY_LABELS[task.priority || "medium"] ?? task.priority}
          </span>
        )}
        {task.due_date && (
          <span className="text-[10px] text-gray-500 font-mono">
            Due {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
      {task.depends_on_shannon && (
        <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
          Needs approval
        </span>
      )}
    </div>
  );
}
