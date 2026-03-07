"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLogStore } from "@/lib/stores/logStore";
import type { LogLevel } from "@/lib/stores/logStore";
import { useSessionStore } from "@/lib/stores/sessionStore";

// --- Shared types ---

interface AgentOption {
  id: string;
  name: string;
  emoji: string;
}

// --- Tab definition ---

type Tab = "activity" | "logs" | "sessions";

const TABS: { key: Tab; label: string }[] = [
  { key: "activity", label: "Activity" },
  { key: "logs", label: "Logs" },
  { key: "sessions", label: "Sessions" },
];

// --- Activity types ---

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

// --- Log constants ---

const levelColors: Record<LogLevel, string> = {
  info: "text-green-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  debug: "text-gray-500",
};

const levelBgColors: Record<LogLevel, string> = {
  info: "bg-green-500/20 text-green-400 border-green-500/30",
  warn: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  debug: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

// --- Session helpers ---

function sessionStatusBadge(status: string) {
  const colors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    idle: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    ended: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return colors[status] || colors.idle;
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDuration(created: string, ended: string | null): string {
  const start = new Date(created).getTime();
  const end = ended ? new Date(ended).getTime() : Date.now();
  const secs = Math.floor((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

// =============================================================================
// Activity Tab
// =============================================================================

function ActivityTab({ agents, filterAgent }: { agents: AgentOption[]; filterAgent: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");

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
        const items = Array.isArray(data?.items) ? data.items : [];
        if (cursor) {
          setActivities((prev) => [...prev, ...items]);
        } else {
          setActivities(items);
        }
        setNextCursor(data?.nextCursor ?? null);
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
  }, [fetchActivities]);

  return (
    <>
      {/* Extra filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
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
        <button
          onClick={() => fetchActivities()}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors font-mono"
        >
          Refresh
        </button>
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
    </>
  );
}

// =============================================================================
// Logs Tab
// =============================================================================

function LogsTab({ filterAgent }: { filterAgent: string }) {
  const {
    loading,
    paused,
    fetchLogs,
    setFilters,
    togglePause,
    clear,
    filteredEntries,
  } = useLogStore();

  const [activeLevels, setActiveLevels] = useState<Set<LogLevel>>(
    new Set(["info", "warn", "error", "debug"])
  );
  const [search, setSearch] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Sync shared agent filter into log store
  useEffect(() => {
    setFilters({ agentId: filterAgent || undefined });
  }, [filterAgent, setFilters]);

  useEffect(() => {
    if (!paused && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  });

  const toggleLevel = (level: LogLevel) => {
    const next = new Set(activeLevels);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    setActiveLevels(next);
    if (next.size === 1) setFilters({ level: [...next][0] });
    else setFilters({ level: undefined });
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setFilters({ search: value || undefined });
  };

  const entries = filteredEntries().filter(
    (e) => activeLevels.size === 4 || activeLevels.has(e.level)
  );

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1">
          {(["info", "warn", "error", "debug"] as LogLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                activeLevels.has(level) ? levelBgColors[level] : "bg-gray-900 text-gray-600 border-gray-800"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1 min-w-[200px]"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={togglePause}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              paused
                ? "bg-green-600/20 text-green-400 hover:bg-green-600/40"
                : "bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/40"
            }`}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={clear}
            className="px-3 py-1.5 text-xs font-medium bg-gray-800 text-gray-400 hover:text-gray-200 rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Log entries */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">No log entries. Logs appear when agents send data via POST /api/logs/ingest</p>
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
          <div className="max-h-[65vh] overflow-y-auto p-2 space-y-0">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-3 py-1 hover:bg-gray-800/20 font-mono text-xs"
              >
                <span className="text-gray-600 shrink-0 w-[140px]">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
                <span className={`shrink-0 w-[45px] uppercase font-bold ${levelColors[entry.level]}`}>
                  {entry.level}
                </span>
                <span className="shrink-0 w-[120px] text-gray-400 truncate">
                  {entry.agentEmoji} {entry.agentName || "-"}
                </span>
                <span className="text-gray-300 break-all">{entry.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================================
// Sessions Tab
// =============================================================================

const SESSIONS_POLL_INTERVAL_MS = 15000;

function SessionsTab() {
  const {
    sessions,
    selectedSessionId,
    loading,
    error,
    fetchSessions,
    selectSession,
  } = useSessionStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Poll for live updates when tab is visible
  useEffect(() => {
    const interval = setInterval(fetchSessions, SESSIONS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleEndSession = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}/end`, { method: "POST" });
      fetchSessions();
    } catch {
      // silent
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500 font-mono">Live feed · refreshes every 15s</span>
        <button
          onClick={() => fetchSessions()}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading && sessions.length === 0 ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : sessions.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">No sessions recorded yet</p>
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">ID</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Agent</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Status</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Started</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Duration</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 font-mono font-normal">Messages</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 font-mono font-normal">Cost</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <>
                  <tr
                    key={s.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/20 cursor-pointer transition-colors"
                    onClick={() => selectSession(selectedSessionId === s.id ? null : s.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{s.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-xs text-gray-300">{s.agentName || s.agentId || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[11px] font-mono rounded border ${sessionStatusBadge(s.status)}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {s.duration || formatDuration(s.createdAt, s.endedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300 font-mono text-right">{s.messageCount}</td>
                    <td className="px-4 py-3 text-xs text-gray-300 font-mono text-right">{formatCost(s.costCents)}</td>
                    <td className="px-4 py-3 text-right">
                      {s.status === "active" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEndSession(s.id);
                          }}
                          className="px-2 py-1 text-[11px] font-medium bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                        >
                          End
                        </button>
                      )}
                    </td>
                  </tr>
                  {selectedSessionId === s.id && (
                    <tr key={`${s.id}-detail`}>
                      <td colSpan={8} className="px-4 py-4 bg-gray-900/80 border-b border-gray-800">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 font-mono mb-1">Session ID</p>
                            <p className="text-xs text-gray-300 font-mono">{s.id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-mono mb-1">Token Count</p>
                            <p className="text-xs text-gray-300 font-mono">{s.tokenCount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-mono mb-1">Cost</p>
                            <p className="text-xs text-gray-300 font-mono">{formatCost(s.costCents)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-mono mb-1">Messages</p>
                            <p className="text-xs text-gray-300 font-mono">{s.messageCount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-mono mb-1">Started</p>
                            <p className="text-xs text-gray-300 font-mono">{new Date(s.createdAt).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-mono mb-1">Ended</p>
                            <p className="text-xs text-gray-300 font-mono">
                              {s.endedAt ? new Date(s.endedAt).toLocaleString() : "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// =============================================================================
// Main Monitoring Page
// =============================================================================

function MonitoringContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const activeTab: Tab = (["activity", "logs", "sessions"].includes(tabParam ?? "") ? tabParam : "activity") as Tab;

  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [filterAgent, setFilterAgent] = useState("");

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => setAgents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const setTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/monitoring?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-lg font-bold text-gray-100">Monitoring</h1>
          <p className="text-xs text-gray-500 font-mono">
            Activity, logs, and sessions in one view
          </p>
        </div>

        {/* Tabs + shared agent filter */}
        <div className="flex items-center gap-4 mb-4 border-b border-gray-800 pb-3 flex-wrap">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                  activeTab === t.key
                    ? "bg-gray-800 text-white border border-gray-700 border-b-gray-950 -mb-[13px] pb-[17px]"
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/40"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Shared agent filter (shown on Activity and Logs tabs) */}
          {activeTab !== "sessions" && (
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 ml-auto"
            >
              <option value="">All agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.emoji} {a.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tab content */}
        {activeTab === "activity" && (
          <ActivityTab agents={agents} filterAgent={filterAgent} />
        )}
        {activeTab === "logs" && <LogsTab filterAgent={filterAgent} />}
        {activeTab === "sessions" && <SessionsTab />}
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    }>
      <MonitoringContent />
    </Suspense>
  );
}
