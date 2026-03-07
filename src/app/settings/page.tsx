"use client";

import { useEffect, useState, useCallback } from "react";

interface Gateway {
  id: string;
  name: string;
  url: string;
  status: string;
  last_check_at: string | null;
  created_at: string;
}

interface Settings {
  gatewayUrl?: string;
  authUser?: string;
  tokenBudget?: string;
  alertThreshold?: string;
  claudeProjectsDir?: string;
  gateways?: Gateway[];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add gateway form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");

  // Test connection state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: string; latencyMs?: number }>>({});

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const addGateway = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), url: newUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add gateway");
      }
      setNewName("");
      setNewUrl("");
      setShowAddForm(false);
      showSuccess("Gateway added");
      await fetchSettings();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateGateway = async (id: string) => {
    if (!editUrl.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editName.trim(), url: editUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update gateway");
      }
      setEditingId(null);
      showSuccess("Gateway updated");
      await fetchSettings();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const deleteGateway = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/settings?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete gateway");
      }
      showSuccess("Gateway removed");
      setTestResults((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await fetchSettings();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const testConnection = async (gw: Gateway) => {
    setTestingId(gw.id);
    try {
      const res = await fetch(`/api/gateways/${gw.id}/check`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTestResults((prev) => ({
          ...prev,
          [gw.id]: { status: data.status, latencyMs: data.latencyMs },
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          [gw.id]: { status: "error" },
        }));
      }
      await fetchSettings();
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [gw.id]: { status: "error" },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const startEdit = (gw: Gateway) => {
    setEditingId(gw.id);
    setEditName(gw.name);
    setEditUrl(gw.url);
  };

  const statusColor = (status: string) => {
    if (status === "online") return "text-green-400";
    if (status === "offline") return "text-red-400";
    return "text-gray-500";
  };

  const statusDot = (status: string) => {
    if (status === "online") return "bg-green-400";
    if (status === "offline") return "bg-red-400";
    return "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[900px] mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-100">Settings</h1>
          <p className="text-xs text-gray-500 font-mono">System configuration</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-red-200">
              dismiss
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 px-4 py-2 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
            {successMsg}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-6">
            {/* Gateway Configuration */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-medium text-gray-300">Gateway URLs</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Configure gateway endpoints for agent communication</p>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors"
                >
                  {showAddForm ? "Cancel" : "+ Add Gateway"}
                </button>
              </div>

              {/* Environment variable fallback */}
              {settings?.gatewayUrl && (
                <div className="mb-3 px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded text-xs">
                  <span className="text-gray-500 font-mono">ENV OPENCLAW_GATEWAY_URL:</span>{" "}
                  <span className="text-gray-400 font-mono">{settings.gatewayUrl}</span>
                </div>
              )}

              {/* Add form */}
              {showAddForm && (
                <div className="mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 font-mono mb-1">Name</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Production Gateway"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 font-mono mb-1">URL</label>
                    <input
                      type="url"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="e.g. https://gateway.example.com"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addGateway}
                      disabled={saving || !newName.trim() || !newUrl.trim()}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Gateway"}
                    </button>
                  </div>
                </div>
              )}

              {/* Gateway list */}
              <div className="space-y-2">
                {(!settings?.gateways || settings.gateways.length === 0) && !showAddForm && (
                  <p className="text-xs text-gray-500 py-2">No gateways configured. Click &quot;+ Add Gateway&quot; to add one.</p>
                )}

                {settings?.gateways?.map((gw) => (
                  <div
                    key={gw.id}
                    className="px-3 py-2.5 bg-gray-800/30 border border-gray-700/50 rounded-lg"
                  >
                    {editingId === gw.id ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 font-mono mb-1">Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono bg-gray-900 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 font-mono mb-1">URL</label>
                          <input
                            type="url"
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono bg-gray-900 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => updateGateway(gw.id)}
                            disabled={saving || !editUrl.trim()}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot(gw.status)}`} />
                            <span className="text-xs font-medium text-gray-300">{gw.name}</span>
                            <span className={`text-xs font-mono ${statusColor(gw.status)}`}>
                              {gw.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{gw.url}</p>
                          {testResults[gw.id] && (
                            <p className={`text-xs font-mono mt-0.5 ${testResults[gw.id].status === "online" ? "text-green-400" : "text-red-400"}`}>
                              {testResults[gw.id].status === "online"
                                ? `Connected (${testResults[gw.id].latencyMs}ms)`
                                : `Unreachable`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-3">
                          <button
                            onClick={() => testConnection(gw)}
                            disabled={testingId === gw.id}
                            className="px-2 py-1 text-xs font-medium text-blue-400 hover:bg-blue-600/20 rounded transition-colors disabled:opacity-50"
                          >
                            {testingId === gw.id ? "Testing..." : "Test"}
                          </button>
                          <button
                            onClick={() => startEdit(gw)}
                            className="px-2 py-1 text-xs font-medium text-gray-400 hover:bg-gray-700/50 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteGateway(gw.id)}
                            className="px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-600/20 rounded transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Auth */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h2 className="text-sm font-medium text-gray-300 mb-3">Authentication</h2>
              <div>
                <p className="text-xs text-gray-500 font-mono">Current User</p>
                <p className="text-xs text-gray-300 font-mono">{settings?.authUser || "Not authenticated"}</p>
              </div>
            </div>

            {/* Budget */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h2 className="text-sm font-medium text-gray-300 mb-3">Token Budget</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-mono">Monthly Budget</p>
                  <p className="text-xs text-gray-300 font-mono">
                    {settings?.tokenBudget ? `$${settings.tokenBudget}` : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-mono">Alert Threshold</p>
                  <p className="text-xs text-gray-300 font-mono">
                    {settings?.alertThreshold ? `${settings.alertThreshold}%` : "Not set"}
                  </p>
                </div>
              </div>
            </div>

            {/* Theme */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h2 className="text-sm font-medium text-gray-300 mb-3">Theme</h2>
              <p className="text-xs text-gray-500">Theme toggle coming soon. Currently using dark theme.</p>
            </div>

            {/* API Keys */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h2 className="text-sm font-medium text-gray-300 mb-3">API Keys</h2>
              <p className="text-xs text-gray-500">API key management coming soon. Generate and revoke keys for external integrations.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
