"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/lib/stores/sessionStore";

function statusBadge(status: string) {
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

export default function SessionsPage() {
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

  const handleEndSession = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}/end`, { method: "POST" });
      fetchSessions();
    } catch {
      // silent
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-100">Sessions</h1>
          <p className="text-xs text-gray-500 font-mono">Active and historical agent sessions</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
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
                        <span className={`px-2 py-0.5 text-[11px] font-mono rounded border ${statusBadge(s.status)}`}>
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
      </div>
    </div>
  );
}
