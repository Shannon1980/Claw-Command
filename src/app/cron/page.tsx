"use client";

import { useEffect, useState, useCallback } from "react";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  action: Record<string, unknown>;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  runCount: number;
  createdAt: string;
}

interface CronRun {
  id: string;
  jobId: string;
  status: string;
  result: string | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

const SCHEDULE_PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Daily at 9am", value: "0 9 * * *" },
  { label: "Weekly (Monday)", value: "0 9 * * 1" },
  { label: "Monthly (1st)", value: "0 0 1 * *" },
];

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, , dow] = parts;

  if (min === "*" && hour === "*") return "Every minute";
  if (min.startsWith("*/") && hour === "*") return `Every ${min.slice(2)} minutes`;
  if (min === "0" && hour.startsWith("*/")) return `Every ${hour.slice(2)} hours`;
  if (min === "0" && hour === "*") return "Every hour";
  if (min === "0" && hour !== "*" && dom === "*" && dow === "*") {
    const h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `Daily at ${h12}:00 ${ampm}`;
  }
  if (min === "0" && hour !== "*" && dom === "*" && dow !== "*") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = days[parseInt(dow)] || dow;
    const h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${dayName} at ${h12}:00 ${ampm}`;
  }
  if (min === "0" && hour === "0" && dom === "1") return "Monthly (1st at midnight)";

  return expr;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

const runStatusColors: Record<string, string> = {
  success: "text-green-400 bg-green-500/10 border-green-500/30",
  error: "text-red-400 bg-red-500/10 border-red-500/30",
  running: "text-blue-400 bg-blue-500/10 border-blue-500/30",
};

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [runResults, setRunResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    schedule: "",
    endpoint: "/api/",
    method: "POST",
    enabled: true,
  });

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/cron");
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const fetchRuns = async (jobId: string) => {
    setRunsLoading(true);
    try {
      const res = await fetch(`/api/cron/${jobId}/runs`);
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : []);
    } catch {
      setRuns([]);
    } finally {
      setRunsLoading(false);
    }
  };

  const handleExpand = (jobId: string) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(jobId);
      fetchRuns(jobId);
    }
  };

  const handleToggle = async (job: CronJob) => {
    // Optimistic update
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, enabled: !j.enabled } : j)));
    try {
      await fetch(`/api/cron/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !job.enabled }),
      });
    } catch {
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, enabled: job.enabled } : j)));
    }
  };

  const handleRunNow = async (job: CronJob) => {
    setRunningJobs((prev) => new Set(prev).add(job.id));
    setRunResults((prev) => {
      const next = { ...prev };
      delete next[job.id];
      return next;
    });

    try {
      const res = await fetch(`/api/cron/${job.id}/run`, { method: "POST" });
      const data = await res.json();
      setRunResults((prev) => ({
        ...prev,
        [job.id]: {
          ok: res.ok && data.ok !== false,
          message: res.ok ? `Completed in ${data.durationMs || 0}ms` : (data.error || "Failed"),
        },
      }));
      fetchJobs();
      if (expandedJobId === job.id) fetchRuns(job.id);
    } catch (err) {
      setRunResults((prev) => ({
        ...prev,
        [job.id]: { ok: false, message: (err as Error).message },
      }));
    } finally {
      setRunningJobs((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      // Clear result after 5s
      setTimeout(() => {
        setRunResults((prev) => {
          const next = { ...prev };
          delete next[job.id];
          return next;
        });
      }, 5000);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/cron/${id}`, { method: "DELETE" });
      setJobs((prev) => prev.filter((j) => j.id !== id));
      setDeleteConfirm(null);
      if (expandedJobId === id) setExpandedJobId(null);
    } catch {
      // silent
    }
  };

  const handleAdd = async () => {
    setError(null);
    if (!formData.name.trim()) { setError("Please enter a job name"); return; }
    if (!formData.schedule) { setError("Please select a schedule"); return; }
    if (!formData.endpoint.trim() || formData.endpoint === "/api/") { setError("Please enter an API endpoint"); return; }
    try {
      const res = await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          schedule: formData.schedule,
          action: { endpoint: formData.endpoint, method: formData.method, payload: {} },
          enabled: formData.enabled,
        }),
      });
      if (!res.ok) throw new Error("Failed to create cron job");
      setShowForm(false);
      setFormData({ name: "", schedule: "", endpoint: "/api/", method: "POST", enabled: true });
      fetchJobs();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Cron Jobs</h1>
            <p className="text-xs text-gray-500 font-mono">
              {jobs.length} job{jobs.length !== 1 ? "s" : ""} &middot; auto-refreshes every 10s
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchJobs()}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              {showForm ? "Cancel" : "Add Job"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 text-xs">dismiss</button>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-lg p-5 space-y-5">
            <h2 className="text-sm font-medium text-gray-300">New Cron Job</h2>

            {/* Job name */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">What should this job be called?</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Daily report sync, Hourly data cleanup..."
                className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
            </div>

            {/* Schedule — dropdown only */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">How often should it run?</label>
              <select
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
              >
                <option value="">Select a schedule...</option>
                {SCHEDULE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Endpoint & method — simple fields */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Which API endpoint should it call?</label>
              <div className="flex gap-2">
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 w-28 shrink-0"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="text"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  placeholder="/api/your-endpoint"
                  className="flex-1 px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 font-mono"
                />
              </div>
              <p className="mt-1 text-xs text-gray-600">
                The API route that will be called each time this job runs
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="rounded bg-gray-900 border-gray-700"
                />
                Start running immediately
              </label>
              <button
                onClick={handleAdd}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-40"
                disabled={!formData.name.trim() || !formData.schedule}
              >
                Create Job
              </button>
            </div>
          </div>
        )}

        {/* Jobs list */}
        {loading && jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">Loading cron jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-30">&#9200;</div>
            <p className="text-gray-500 text-sm mb-4">No cron jobs configured</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-600/30 transition-colors"
            >
              Create your first cron job
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                {/* Job row */}
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-800/30 transition-colors"
                  onClick={() => handleExpand(job.id)}
                >
                  {/* Toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggle(job); }}
                    className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${
                      job.enabled ? "bg-green-600" : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        job.enabled ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>

                  {/* Name & schedule */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200 truncate">{job.name}</span>
                      {!job.enabled && (
                        <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">paused</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{describeCron(job.schedule)}</span>
                      <span className="text-[10px] text-gray-600 font-mono">{job.schedule}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Last run</p>
                      <p className="text-xs text-gray-400 font-mono">
                        {job.lastRun ? relativeTime(job.lastRun) : "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Runs</p>
                      <p className="text-xs text-gray-300 font-mono">{job.runCount}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRunNow(job)}
                      disabled={runningJobs.has(job.id)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors disabled:opacity-50"
                    >
                      {runningJobs.has(job.id) ? (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          Running
                        </span>
                      ) : (
                        "Run Now"
                      )}
                    </button>

                    {deleteConfirm === job.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="px-2 py-1 text-[11px] font-medium bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-1.5 py-1 text-[11px] text-gray-500 hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(job.id)}
                        className="px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-600/20 rounded transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Expand icon */}
                  <svg
                    className={`w-4 h-4 text-gray-600 transition-transform shrink-0 ${expandedJobId === job.id ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Run result toast */}
                {runResults[job.id] && (
                  <div className={`mx-4 mb-2 px-3 py-1.5 rounded text-xs border ${
                    runResults[job.id].ok
                      ? "bg-green-500/10 text-green-400 border-green-500/30"
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                  }`}>
                    {runResults[job.id].ok ? "Success" : "Failed"}: {runResults[job.id].message}
                  </div>
                )}

                {/* Expanded: run history */}
                {expandedJobId === job.id && (
                  <div className="border-t border-gray-800/50 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs text-gray-500 font-mono">Run History</h3>
                      <button
                        onClick={() => fetchRuns(job.id)}
                        className="text-[10px] text-gray-600 hover:text-gray-400"
                      >
                        refresh
                      </button>
                    </div>

                    {/* Action config */}
                    <div className="mb-3 px-3 py-2 bg-gray-950/50 rounded text-xs font-mono text-gray-500 overflow-x-auto">
                      <span className="text-gray-600">Action: </span>
                      {JSON.stringify(job.action, null, 0)}
                    </div>

                    {runsLoading ? (
                      <p className="text-xs text-gray-600">Loading runs...</p>
                    ) : runs.length === 0 ? (
                      <p className="text-xs text-gray-600 py-2">No run history yet</p>
                    ) : (
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {runs.map((run) => (
                          <div key={run.id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-gray-800/20">
                            <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${runStatusColors[run.status] || runStatusColors.running}`}>
                              {run.status}
                            </span>
                            <span className="text-xs text-gray-400 font-mono flex-1">
                              {new Date(run.startedAt).toLocaleString()}
                            </span>
                            {run.durationMs != null && (
                              <span className="text-[10px] text-gray-600 font-mono">{run.durationMs}ms</span>
                            )}
                            {run.error && (
                              <span className="text-[10px] text-red-400 truncate max-w-[200px]" title={run.error}>
                                {run.error}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
