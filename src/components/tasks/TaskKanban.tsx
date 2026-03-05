"use client";

import { useState } from "react";
import type { Task } from "@/lib/hooks/useTasks";
import TaskCard from "./TaskCard";
import TaskEditModal from "./TaskEditModal";

const TASK_STAGES = ["backlog", "in_progress", "blocked", "done"] as const;
const STAGE_LABELS: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};
const STAGE_COLORS: Record<string, string> = {
  backlog: "border-t-gray-600",
  in_progress: "border-t-blue-500",
  blocked: "border-t-amber-500",
  done: "border-t-green-500",
};

interface TaskKanbanProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
  refresh: () => void;
}

export default function TaskKanban({
  tasks,
  onStatusChange,
  refresh,
}: TaskKanbanProps) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleDrop = async (taskId: string, newStage: string) => {
    setDragOver(null);
    await onStatusChange(taskId, newStage);
  };

  const handleEditComplete = () => {
    setEditingTask(null);
    refresh();
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {TASK_STAGES.map((stage) => {
          const stageTasks = tasks.filter((t) => t.status === stage);
          return (
            <div
              key={stage}
              className={`flex-shrink-0 w-64 flex flex-col rounded-lg border transition-colors ${
                dragOver === stage
                  ? "border-cyan-500/50 bg-cyan-500/5"
                  : "border-gray-800 bg-gray-900/30"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(stage);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) handleDrop(id, stage);
              }}
            >
              <div
                className={`px-3 py-2 border-t-2 rounded-t-lg ${
                  STAGE_COLORS[stage] || "border-t-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                    {STAGE_LABELS[stage]}
                  </h3>
                  <span className="text-[10px] font-mono text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
                    {stageTasks.length}
                  </span>
                </div>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px]">
                {stageTasks.map((task) => (
                  <div key={task.id}>
                    <TaskCard
                      task={task}
                      onClick={() => setEditingTask(task)}
                    />
                  </div>
                ))}
                {stageTasks.length === 0 && (
                  <div className="text-xs text-gray-700 text-center py-4 font-mono">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={handleEditComplete}
        />
      )}
    </>
  );
}
