"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAgentStore } from "@/lib/stores/agentStore";
import type { Agent } from "@/lib/stores/agentStore";

function heartbeatColor(updatedAt: string): string {
  const diff = (Date.now() - new Date(updatedAt).getTime()) / 1000;
  if (diff < 60) return "bg-green-500";
  if (diff < 300) return "bg-yellow-500";
  return "bg-red-500";
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    blocked: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    idle: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    waiting_for_shannon: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };
  return colors[status] || colors.idle;
}

function taskStatusBadge(status: string) {
  const colors: Record<string, string> = {
    in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    backlog: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    blocked: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    review: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    done: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return colors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

export default function AgentsPage() {
  const { agents, loading, error, fetchAgents } = useAgentStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    emoji: "",
    domain: "vorentoe",
    capabilities: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [retiring, setRetiring] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);

  const handlePingAll = async () => {
    setPinging(true);
    try {
      await fetch("/api/heartbeat-all", { method: "POST" });
      await fetchAgents();
    } catch {
      // silent
    } finally {
      setPinging(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleRegister = async () => {
    setFormError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to register agent");
      }
      setShowForm(false);
      setFormData({ name: "", emoji: "", domain: "vorentoe", capabilities: "" });
      fetchAgents();
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const handleRetire = async (agent: Agent) => {
    if (!confirm(`Retire agent "${agent.name}"?`)) return;
    setRetiring(agent.id);
    try {
      await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retiredAt: new Date().toISOString() }),
      });
      fetchAgents();
    } catch {
      // silent
    } finally {
      setRetiring(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Agents</h1>
            <p className="text-xs text-gray-500 font-mono">Manage and monitor registered agents</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePingAll}
              disabled={pinging}
              className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {pinging ? "Pinging..." : "Ping All"}
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              {showForm ? "Cancel" : "Register Agent"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-medium text-gray-300">Register New Agent</h2>
            {formError && (
              <p className="text-xs text-red-400">{formError}</p>
            )}
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
                <label className="block text-xs text-gray-500 font-mono mb-1">Emoji</label>
                <input
                  type="text"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. robot emoji"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-mono mb-1">Domain</label>
                <select
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="vorentoe">vorentoe</option>
                  <option value="skyward">skyward</option>
                  <option value="community">community</option>
                  <option value="teaching">teaching</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-mono mb-1">Capabilities</label>
              <textarea
                value={formData.capabilities}
                onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
                rows={3}
                className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleRegister}
              className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
            >
              Register
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : agents.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No agents registered yet. Click &quot;Register Agent&quot; to add one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.filter((a) => !a.retiredAt).map((agent) => (
              <div key={agent.id} className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-800/30 transition-colors"
                  onClick={() => setExpandedId(expandedId === agent.id ? null : agent.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{agent.emoji}</span>
                      <Link href={`/agents/${agent.id}`} className="text-sm font-medium text-gray-100 hover:text-blue-400 transition-colors" onClick={(e) => e.stopPropagation()}>{agent.name}</Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${heartbeatColor(agent.updatedAt)}`} title="Heartbeat" />
                      <span className={`px-2 py-0.5 text-[11px] font-mono rounded border ${statusBadge(agent.status)}`}>
                        {agent.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-1.5 py-0.5 text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                      {agent.domain}
                    </span>
                    {agent.openTaskCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[11px] font-mono bg-gray-800 text-gray-400 rounded">
                        {agent.openTaskCount} task{agent.openTaskCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {agent.taskTitle ? (
                    <div className="bg-gray-950/50 border border-gray-800 rounded p-2 mt-1">
                      <p className="text-xs text-gray-300 leading-tight mb-1.5">{agent.taskTitle}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${taskStatusBadge(agent.taskStatus || "")}`}>
                          {agent.taskStatus?.replace(/_/g, " ")}
                        </span>
                        {agent.taskPriority && agent.taskPriority !== "medium" && (
                          <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                            agent.taskPriority === "high" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                          }`}>
                            {agent.taskPriority}
                          </span>
                        )}
                        {agent.taskDueDate && (
                          <span className="text-[10px] text-gray-500 font-mono">
                            Due {new Date(agent.taskDueDate).toLocaleDateString()}
                          </span>
                        )}
                        {agent.taskDependsOnShannon && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Needs approval
                          </span>
                        )}
                      </div>
                    </div>
                  ) : agent.currentTaskId ? (
                    <p className="text-xs text-gray-400 font-mono truncate mt-1">
                      Task: {agent.currentTaskId}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600 italic mt-1">No active task</p>
                  )}
                  <p className="text-[11px] text-gray-600 font-mono mt-1.5">
                    Last heartbeat: {new Date(agent.updatedAt).toLocaleString()}
                  </p>
                </div>

                {expandedId === agent.id && (
                  <div className="border-t border-gray-800 p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 font-mono">ID</p>
                      <p className="text-xs text-gray-300 font-mono">{agent.id}</p>
                    </div>
                    {agent.capabilities && (
                      <div>
                        <p className="text-xs text-gray-500 font-mono">Capabilities</p>
                        <p className="text-xs text-gray-300">{agent.capabilities}</p>
                      </div>
                    )}
                    {agent.soul && (
                      <div>
                        <p className="text-xs text-gray-500 font-mono">Soul Config</p>
                        <p className="text-xs text-gray-300">{agent.soul}</p>
                      </div>
                    )}
                    {agent.currentTaskId && (
                      <div>
                        <p className="text-xs text-gray-500 font-mono">Current Task</p>
                        <a href={`/tasks`} className="text-xs text-blue-400 hover:text-blue-300 font-mono">
                          {agent.currentTaskId}
                        </a>
                        {agent.taskTitle && (
                          <p className="text-xs text-gray-300 mt-0.5">{agent.taskTitle}</p>
                        )}
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 font-mono">Open Tasks</p>
                      <p className="text-xs text-gray-300 font-mono">{agent.openTaskCount}</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Link
                        href={`/agents/${agent.id}`}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                      >
                        View Details
                      </Link>
                      <a
                        href={`/spawn?agent=${agent.id}`}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                      >
                        Spawn
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetire(agent);
                        }}
                        disabled={retiring === agent.id}
                        className="px-3 py-1.5 text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors disabled:opacity-50"
                      >
                        {retiring === agent.id ? "Retiring..." : "Retire"}
                      </button>
                    </div>
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
