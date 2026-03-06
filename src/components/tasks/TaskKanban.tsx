"use client";

import { useState } from "react";
import type { Task } from "@/lib/hooks/useTasks";
import TaskCard from "./TaskCard";
import TaskEditModal from "./TaskEditModal";

const TASK_STAGES = ["backlog", "ready", "in_progress", "review", "blocked", "done"] as const;
const STAGE_LABELS: Record<string, string> = {
  backlog: "Backlog",
  ready: "Ready",
  in_progress: "In Progress",
  review: "Review",
  blocked: "Blocked",
  done: "Done",
};
const STAGE_COLORS: Record<string, string> = {
  backlog: "border-t-gray-600",
  ready: "border-t-cyan-500",
  in_progress: "border-t-blue-500",
  review: "border-t-purple-500",
  blocked: "border-t-amber-500",
  done: "border-t-green-500",
};
const PRIORITY_ORDER = { high: 1, medium: 2, low: 3 };

interface Agent {
  id: string;
  name: string;
  emoji: string;
}

interface TaskKanbanProps {
  tasks: Task[];
  agents: Agent[];
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
  refresh: () => void;
}

export default function TaskKanban({
  tasks,
  agents,
  onStatusChange,
  refresh,
}: TaskKanbanProps) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const handleDrop = async (taskId: string, newStage: string) => {
    setDragOver(null);
    await onStatusChange(taskId, newStage);
  };

  const handleEditComplete = () => {
    setEditingTask(null);
    setAddTaskOpen(false);
    refresh();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setAddTaskOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {TASK_STAGES.map((stage) => {
          const stageTasks = tasks
            .filter((t) => t.status === stage)
            .sort((a, b) => (PRIORITY_ORDER[(a.priority || "medium") as keyof typeof PRIORITY_ORDER] ?? 2) - (PRIORITY_ORDER[(b.priority || "medium") as keyof typeof PRIORITY_ORDER] ?? 2));
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

      {(editingTask || addTaskOpen) && (
        <TaskEditModal
          task={addTaskOpen ? null : editingTask}
          agents={agents}
          onClose={() => {
            setEditingTask(null);
            setAddTaskOpen(false);
          }}
          onSaved={handleEditComplete}
        />
      )}
    </>
  );
}
