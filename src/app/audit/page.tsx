"use client";

import { useEffect, useState } from "react";

interface AuditEvent {
  id: string;
  user: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  createdAt: string;
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [sinceFilter, setSinceFilter] = useState("");

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (userFilter) params.set("user", userFilter);
      if (actionFilter) params.set("action", actionFilter);
      if (sinceFilter) params.set("since", sinceFilter);
      const res = await fetch(`/api/audit?${params}`, { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to fetch audit events");
      }
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const users = [...new Set(events.map((e) => e.user).filter(Boolean))];
  const actions = [...new Set(events.map((e) => e.action).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Audit Log</h1>
            <p className="text-xs text-gray-500 font-mono">System activity and change tracking</p>
          </div>
          <button
            onClick={() => fetchEvents()}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500 font-mono">Since:</label>
            <input
              type="date"
              value={sinceFilter}
              onChange={(e) => setSinceFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={fetchEvents}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors"
          >
            Apply
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : events.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500 mb-2">No audit events found</p>
            <p className="text-xs text-gray-600 max-w-md mx-auto">
              Events are logged when users log in, create/update agents, users, or webhooks. Try logging in or making changes elsewhere to generate events.
            </p>
          </div>
        ) : (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">User</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Action</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Resource Type</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Resource ID</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">{event.user}</td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                        {event.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{event.resourceType}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono truncate max-w-[120px]">{event.resourceId}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[200px]">{event.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
