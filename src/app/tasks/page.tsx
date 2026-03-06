"use client";

import { useState, useCallback } from "react";
import { useTasksWithFilter, type Task, type TaskFilter } from "@/lib/hooks/useTasks";
import { useAgents } from "@/lib/hooks/useAgents";
import TaskKanban from "@/components/tasks/TaskKanban";

export default function TasksPage() {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const { tasks, loading, error, refresh } = useTasksWithFilter(filter);
  const { agents } = useAgents();

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: string) => {
      setSaveError(null);
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          refresh();
        } else {
          const data = await res.json().catch(() => ({}));
          setSaveError(data.error || data.details || `Failed to save (${res.status})`);
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to save");
      }
    },
    [refresh]
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Tasks</h1>
            <p className="text-xs text-gray-500 font-mono">
              Monitor and manage tasks by agent
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 uppercase">Filter:</label>
            <select
              value={
                filter === "all"
                  ? "all"
                  : filter === "my_approvals"
                    ? "my_approvals"
                    : filter === "my_tasks"
                      ? "my_tasks"
                      : filter.agent
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === "all") setFilter("all");
                else if (v === "my_approvals") setFilter("my_approvals");
                else if (v === "my_tasks") setFilter("my_tasks");
                else setFilter({ agent: v });
              }}
              className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All tasks</option>
              <option value="my_approvals">My approvals</option>
              <option value="my_tasks">👤 My tasks</option>
              {agents?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.emoji} {a.name}
                  </option>
                ))}
            </select>
            <button
              onClick={refresh}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {(error || saveError) && (
          <div className="mb-4 px-4 py-2 bg-amber-900/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
            {String(error || saveError)}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-gray-400 py-12">
            <div className="w-5 h-5 border-2 border-gray-500 border-t-gray-200 rounded-full animate-spin" />
            Loading tasks...
          </div>
        ) : (
          <TaskKanban
            tasks={tasks}
            agents={agents ?? []}
            onStatusChange={handleStatusChange}
            refresh={refresh}
          />
        )}
      </div>
    </div>
  );
}
