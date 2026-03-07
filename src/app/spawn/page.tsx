"use client";

import { useEffect, useState } from "react";
import { useAgentStore } from "@/lib/stores/agentStore";

interface SpawnHistory {
  id: string;
  agentId: string;
  agentName?: string;
  taskDescription?: string;
  createdAt: string;
  status?: string;
}

export default function SpawnPage() {
  const { agents, fetchAgents } = useAgentStore();
  const [history, setHistory] = useState<SpawnHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [spawning, setSpawning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    agentId: "",
    task: "",
    priority: "med",
    context: "",
  });

  useEffect(() => {
    // Pre-select agent from URL params
    const params = new URLSearchParams(window.location.search);
    const agentParam = params.get("agent");
    if (agentParam) {
      setFormData((prev) => ({ ...prev, agentId: agentParam }));
    }

    fetchAgents();
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/activities?event_type=agent_spawned&limit=20");
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    }
  };

  const handleSpawn = async () => {
    setError(null);
    setSuccess(null);
    setSpawning(true);
    try {
      const res = await fetch("/api/mc/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: formData.agentId,
          task: formData.task,
          priority: formData.priority,
          context: formData.context,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to spawn agent");
      }
      setSuccess("Agent spawned successfully");
      setFormData((prev) => ({ ...prev, task: "", context: "" }));
      fetchHistory();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSpawning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[900px] mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-100">Spawn Agent</h1>
          <p className="text-xs text-gray-500 font-mono">Spawn an agent with a task assignment</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-2 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Spawn form */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-4 mb-8">
          <div>
            <label className="block text-xs text-gray-500 font-mono mb-1">Agent</label>
            <select
              value={formData.agentId}
              onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
              className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select agent...</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.emoji} {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-mono mb-1">Task Description</label>
            <textarea
              value={formData.task}
              onChange={(e) => setFormData({ ...formData, task: e.target.value })}
              rows={4}
              className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 font-mono mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">High</option>
                <option value="med">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-mono mb-1">Context</label>
            <textarea
              value={formData.context}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              rows={3}
              className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional context for the agent..."
            />
          </div>
          <button
            onClick={handleSpawn}
            disabled={spawning || !formData.agentId || !formData.task}
            className="px-6 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {spawning ? "Spawning..." : "Spawn"}
          </button>
        </div>

        {/* Spawn history */}
        <div>
          <h2 className="text-sm font-medium text-gray-300 mb-3">Spawn History</h2>
          {history.length === 0 ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-500">No spawn events recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-300">{h.agentName || h.agentId}</p>
                    {h.taskDescription && (
                      <p className="text-[11px] text-gray-500 truncate max-w-[400px]">{h.taskDescription}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-600 font-mono">
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
