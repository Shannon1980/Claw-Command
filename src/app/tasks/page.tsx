"use client";

import { useEffect, useCallback } from "react";
import { useTaskStore, type TaskStatus } from "@/lib/stores/taskStore";
import { useAgentStore } from "@/lib/stores/agentStore";
import TaskKanban from "@/components/tasks/TaskKanban";

export default function TasksPage() {
  const { tasks, loading, error, fetchTasks, moveTask } = useTaskStore();
  const { agents, fetchAgents } = useAgentStore();

  useEffect(() => {
    fetchTasks();
    fetchAgents();
  }, [fetchTasks, fetchAgents]);

  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: string) => {
      await moveTask(taskId, newStatus as TaskStatus);
    },
    [moveTask]
  );

  return (
    <div className="p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Tasks</h1>
            <p className="text-xs text-gray-500 font-mono">
              Drag and drop to change status. Click to edit.
            </p>
          </div>
          <button
            onClick={fetchTasks}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors font-mono"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-amber-900/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
            {error}
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
            agents={agents}
            onStatusChange={handleStatusChange}
            refresh={fetchTasks}
          />
        )}
      </div>
    </div>
  );
}
