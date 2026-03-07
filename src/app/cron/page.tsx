"use client";

import { useEffect, useState } from "react";

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

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    schedule: "",
    action: "{}",
    enabled: true,
  });

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cron");
      if (!res.ok) throw new Error("Failed to fetch cron jobs");
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleToggle = async (job: CronJob) => {
    try {
      await fetch(`/api/cron/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !job.enabled }),
      });
      fetchJobs();
    } catch {
      // silent
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      await fetch(`/api/cron/${id}/run`, { method: "POST" });
      fetchJobs();
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this cron job?")) return;
    try {
      await fetch(`/api/cron/${id}`, { method: "DELETE" });
      fetchJobs();
    } catch {
      // silent
    }
  };

  const handleAdd = async () => {
    setError(null);
    try {
      let parsedAction;
      try {
        parsedAction = JSON.parse(formData.action);
      } catch {
        setError("Invalid JSON in action field");
        return;
      }
      const res = await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          schedule: formData.schedule,
          action: parsedAction,
          enabled: formData.enabled,
        }),
      });
      if (!res.ok) throw new Error("Failed to create cron job");
      setShowForm(false);
      setFormData({ name: "", schedule: "", action: "{}", enabled: true });
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
            <p className="text-xs text-gray-500 font-mono">Scheduled tasks and automation</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            {showForm ? "Cancel" : "Add Job"}
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-medium text-gray-300">Add Cron Job</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 font-mono mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-mono mb-1">Schedule (cron expression)</label>
                <input
                  type="text"
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  placeholder="*/5 * * * *"
                  className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-mono mb-1">Action (JSON)</label>
              <textarea
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                rows={4}
                className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cron-enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="rounded bg-gray-900 border-gray-700"
              />
              <label htmlFor="cron-enabled" className="text-xs text-gray-400 font-mono">Enabled</label>
            </div>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
            >
              Create Job
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : jobs.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No cron jobs configured. Click &quot;Add Job&quot; to create one.</p>
          </div>
        ) : (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Name</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Schedule</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Last Run</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Next Run</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-mono font-normal">Runs</th>
                  <th className="text-center px-4 py-3 text-xs text-gray-500 font-mono font-normal">Enabled</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                    <td className="px-4 py-3 text-xs text-gray-300">{job.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{job.schedule}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {job.lastRun ? new Date(job.lastRun).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {job.nextRun ? new Date(job.nextRun).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300 font-mono text-right">{job.runCount}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(job)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${
                          job.enabled ? "bg-green-600" : "bg-gray-700"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                            job.enabled ? "left-4" : "left-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleRunNow(job.id)}
                          className="px-2 py-1 text-[11px] font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors"
                        >
                          Run Now
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="px-2 py-1 text-[11px] font-medium bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
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
