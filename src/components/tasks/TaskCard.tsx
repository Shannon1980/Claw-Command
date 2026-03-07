"use client";

import type { Task } from "@/lib/stores/taskStore";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  inbox: "border-gray-500",
  backlog: "border-gray-600",
  in_progress: "border-blue-500/50",
  review: "border-purple-500/50",
  quality_review: "border-indigo-500/50",
  blocked: "border-amber-500/50",
  done: "border-green-500/50",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-gray-800 text-gray-400",
  low: "bg-green-500/20 text-green-400",
};

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const statusColor = STATUS_COLORS[task.status] || "border-gray-600";

  return (
    <div
      onClick={onClick}
      className={`bg-gray-900/80 border-l-4 ${statusColor} border border-gray-800 rounded-lg p-3 cursor-pointer hover:border-gray-600 transition-all`}
    >
      <h4 className="text-sm font-medium text-gray-200 leading-tight mb-2">
        {task.title}
      </h4>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-gray-400">
          {task.agent_emoji ?? "👤"} {task.agent_name ?? "Shannon"}
        </span>
        {task.priority !== "medium" && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${PRIORITY_COLORS[task.priority] || ""}`}
          >
            {PRIORITY_LABELS[task.priority] ?? task.priority}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {task.dueDate && (
          <span className="text-[10px] text-gray-500 font-mono">
            Due {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        {task.project && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">
            {task.project}
          </span>
        )}
        {task.ticketRef && (
          <span className="text-[10px] text-gray-600 font-mono">
            #{task.ticketRef}
          </span>
        )}
      </div>
      {task.dependsOnShannon && (
        <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
          Needs approval
        </span>
      )}
    </div>
  );
}
