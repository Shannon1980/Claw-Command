"use client";

import { useEffect, useRef, useState } from "react";
import { useLogStore } from "@/lib/stores/logStore";
import type { LogLevel } from "@/lib/stores/logStore";

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

interface AgentOption {
  id: string;
  name: string;
  emoji: string;
}

export default function LogsPage() {
  const {
    loading,
    paused,
    fetchLogs,
    setFilters,
    togglePause,
    clear,
    filteredEntries,
    filters,
  } = useLogStore();

  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [activeLevels, setActiveLevels] = useState<Set<LogLevel>>(
    new Set(["info", "warn", "error", "debug"])
  );
  const [search, setSearch] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLogs();
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => setAgents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [fetchLogs]);

  useEffect(() => {
    if (!paused && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  });

  const toggleLevel = (level: LogLevel) => {
    const next = new Set(activeLevels);
    if (next.has(level)) {
      next.delete(level);
    } else {
      next.add(level);
    }
    setActiveLevels(next);
    // If exactly one level active, set filter; otherwise clear level filter
    if (next.size === 1) {
      setFilters({ level: [...next][0] });
    } else {
      setFilters({ level: undefined });
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setFilters({ search: value || undefined });
  };

  const entries = filteredEntries().filter(
    (e) => activeLevels.size === 4 || activeLevels.has(e.level)
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Logs</h1>
            <p className="text-xs text-gray-500 font-mono">
              Real-time log viewer &middot; {entries.length} entries
            </p>
          </div>
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

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select
            value={filters.agentId || ""}
            onChange={(e) => setFilters({ agentId: e.target.value || undefined })}
            className="px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji} {a.name}
              </option>
            ))}
          </select>

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
            <div className="max-h-[70vh] overflow-y-auto p-2 space-y-0">
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
      </div>
    </div>
  );
}
