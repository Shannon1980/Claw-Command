"use client";

import { useEffect, useState } from "react";

interface DependencyTask {
  id: string;
  title: string;
  agent_name: string;
  agent_emoji: string;
  status: string;
  due_date: string;
}

function getUrgency(dueDate: string): { class: string; label: string } {
  const now = new Date();
  const due = new Date(dueDate);
  const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursLeft < 0)
    return {
      class: "text-red-400 bg-red-500/10 border-red-500/30",
      label: "OVERDUE",
    };
  if (hoursLeft < 72)
    return {
      class: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      label: "URGENT",
    };
  return {
    class: "text-green-400 bg-green-500/10 border-green-500/30",
    label: "ON TRACK",
  };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DependenciesPanel() {
  const [tasks, setTasks] = useState<DependencyTask[]>([]);
  const [actioned, setActioned] = useState<
    Record<string, "approved" | "rejected">
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/tasks?depends_on_shannon=true");
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (
    taskId: string,
    action: "approved" | "rejected"
  ) => {
    setActioned((prev) => ({ ...prev, [taskId]: action }));
    try {
      await fetch(
        `/api/tasks/${taskId}/${action === "approved" ? "approve" : "reject"}`,
        { method: "POST" }
      );
    } catch (error) {
      console.error("Action failed:", error);
    }
  };

  const sorted = [...tasks].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-sm font-mono font-bold text-amber-400 tracking-wider uppercase flex items-center gap-2">
          <span>⚡</span> Needs Your Attention
          <span className="ml-auto bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
            {sorted.length}
          </span>
        </h2>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-sm text-gray-500 font-mono animate-pulse">
          Loading...
        </div>
      ) : sorted.length === 0 ? (
        <div className="px-4 py-6 text-sm text-gray-600 text-center font-mono">
          ✅ Nothing needs your attention right now
        </div>
      ) : (
        <div className="divide-y divide-gray-800/50">
          {sorted.map((task) => {
            const urgency = getUrgency(task.due_date);
            const action = actioned[task.id];

            return (
              <div
                key={task.id}
                className={`px-4 py-3 transition-all ${
                  action ? "opacity-50" : "hover:bg-gray-800/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm text-gray-200 font-medium leading-tight">
                    {task.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${urgency.class}`}
                  >
                    {urgency.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    Due {formatDate(task.due_date)}
                  </span>
                  <span className="text-xs text-gray-600">•</span>
                  <span className="text-xs text-gray-400">
                    {task.agent_emoji} {task.agent_name}
                  </span>
                </div>

                {action ? (
                  <div
                    className={`text-xs font-mono ${
                      action === "approved" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {action === "approved" ? "✅ Approved" : "❌ Rejected"}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(task.id, "approved")}
                      className="text-xs px-3 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors font-medium"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => handleAction(task.id, "rejected")}
                      className="text-xs px-3 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors font-medium"
                    >
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
