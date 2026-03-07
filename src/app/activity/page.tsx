"use client";

import { useState, useEffect, useCallback } from "react";

interface Activity {
  id: string;
  agent_name: string;
  agent_emoji: string;
  event_type: string;
  resource_type: string;
  resource_id: string;
  description: string;
  timestamp: string;
}

const EVENT_COLORS: Record<string, string> = {
  task_started: "text-blue-400",
  task_completed: "text-green-400",
  task_reviewed: "text-purple-400",
  agent_spawned: "text-cyan-400",
  agent_heartbeat: "text-gray-500",
  error: "text-red-400",
  alert_fired: "text-amber-400",
  session_started: "text-indigo-400",
  session_ended: "text-gray-400",
  approval_requested: "text-amber-400",
  approval_given: "text-green-400",
  message_sent: "text-cyan-400",
};

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState("");
  const [filterType, setFilterType] = useState("");
  const [agents, setAgents] = useState<{ id: string; name: string; emoji: string }[]>([]);

  const fetchActivities = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (cursor) params.set("cursor", cursor);
        if (filterAgent) params.set("agent", filterAgent);
        if (filterType) params.set("type", filterType);
        const res = await fetch(`/api/activities?${params}`);
        const data = await res.json();
        if (cursor) {
          setActivities((prev) => [...prev, ...data.items]);
        } else {
          setActivities(data.items || []);
        }
        setNextCursor(data.nextCursor);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    },
    [filterAgent, filterType]
  );

  useEffect(() => {
    fetchActivities();
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d) => setAgents(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [fetchActivities]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-100">Activity</h1>
          <p className="text-xs text-gray-500 font-mono">
            Real-time event stream from all agents
          </p>
        </div>
        <button
          onClick={() => fetchActivities()}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors font-mono"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg text-gray-100"
        >
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.emoji} {a.name}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg text-gray-100"
        >
          <option value="">All event types</option>
          <option value="task_started">Task Started</option>
          <option value="task_completed">Task Completed</option>
          <option value="task_reviewed">Task Reviewed</option>
          <option value="agent_spawned">Agent Spawned</option>
          <option value="alert_fired">Alert Fired</option>
          <option value="error">Error</option>
          <option value="session_started">Session Started</option>
          <option value="session_ended">Session Ended</option>
        </select>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 px-4 py-2.5 bg-gray-900/30 border border-gray-800/50 rounded-lg hover:bg-gray-900/50 transition-colors"
          >
            <span className="text-lg shrink-0">{activity.agent_emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-300">
                  {activity.agent_name}
                </span>
                <span
                  className={`text-[10px] font-mono uppercase ${
                    EVENT_COLORS[activity.event_type] || "text-gray-500"
                  }`}
                >
                  {activity.event_type.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {activity.description}
              </p>
            </div>
            <span className="text-[10px] font-mono text-gray-600 shrink-0">
              {new Date(activity.timestamp).toLocaleString()}
            </span>
          </div>
        ))}

        {activities.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-600 font-mono text-sm">
            No activities recorded yet
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-gray-400 py-6 justify-center">
            <div className="w-4 h-4 border-2 border-gray-500 border-t-gray-200 rounded-full animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        )}

        {nextCursor && !loading && (
          <button
            onClick={() => fetchActivities(nextCursor)}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 font-mono"
          >
            Load more...
          </button>
        )}
      </div>
    </div>
  );
}
