"use client";

import { useEffect, useState } from "react";

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  createdAt: string;
}

interface Delivery {
  id: string;
  webhookId: string;
  eventType: string;
  responseCode: number | null;
  status: string;
  createdAt: string;
}

const eventTypes = [
  "task_created",
  "task_completed",
  "agent_online",
  "agent_offline",
  "alert_fired",
  "session_started",
  "session_ended",
  "pipeline_completed",
];

function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "whsec_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    events: new Set<string>(),
    secret: generateSecret(),
  });

  const fetchWebhooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/webhooks");
      if (!res.ok) throw new Error("Failed to fetch webhooks");
      const data = await res.json();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveries = async (id: string) => {
    try {
      const res = await fetch(`/api/webhooks/${id}/deliveries`);
      if (res.ok) {
        const data = await res.json();
        setDeliveries((prev) => ({ ...prev, [id]: Array.isArray(data) ? data : [] }));
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchDeliveries(id);
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    try {
      await fetch(`/api/webhooks/${webhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !webhook.enabled }),
      });
      fetchWebhooks();
    } catch {
      // silent
    }
  };

  const handleTest = async (id: string) => {
    try {
      await fetch(`/api/webhooks/${id}/test`, { method: "POST" });
      fetchDeliveries(id);
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this webhook?")) return;
    try {
      await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      fetchWebhooks();
    } catch {
      // silent
    }
  };

  const toggleEvent = (event: string) => {
    const next = new Set(formData.events);
    if (next.has(event)) next.delete(event);
    else next.add(event);
    setFormData({ ...formData, events: next });
  };

  const handleAdd = async () => {
    setError(null);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          url: formData.url,
          events: [...formData.events],
          secret: formData.secret,
        }),
      });
      if (!res.ok) throw new Error("Failed to create webhook");
      setShowForm(false);
      setFormData({ name: "", url: "", events: new Set(), secret: generateSecret() });
      fetchWebhooks();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleSecretVisibility = (id: string) => {
    const next = new Set(showSecrets);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setShowSecrets(next);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Webhooks</h1>
            <p className="text-xs text-gray-500 font-mono">Manage webhook endpoints and deliveries</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            {showForm ? "Cancel" : "Add Webhook"}
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-medium text-gray-300">Add Webhook</h2>
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
                <label className="block text-xs text-gray-500 font-mono mb-1">URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-mono mb-1">Events</label>
              <div className="flex flex-wrap gap-2">
                {eventTypes.map((evt) => (
                  <button
                    key={evt}
                    onClick={() => toggleEvent(evt)}
                    className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                      formData.events.has(evt)
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-gray-900 text-gray-500 border-gray-800"
                    }`}
                  >
                    {evt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-mono mb-1">Secret</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => setFormData({ ...formData, secret: generateSecret() })}
                  className="px-3 py-1.5 text-xs bg-gray-800 text-gray-400 hover:text-gray-200 rounded-lg transition-colors"
                >
                  Regenerate
                </button>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
            >
              Create Webhook
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : webhooks.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No webhooks configured. Click &quot;Add Webhook&quot; to create one.</p>
          </div>
        ) : (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Name</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">URL</th>
                  <th className="text-center px-4 py-3 text-xs text-gray-500 font-mono font-normal">Events</th>
                  <th className="text-center px-4 py-3 text-xs text-gray-500 font-mono font-normal">Enabled</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((wh) => (
                  <>
                    <tr
                      key={wh.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/20 cursor-pointer"
                      onClick={() => handleExpand(wh.id)}
                    >
                      <td className="px-4 py-3 text-xs text-gray-300">{wh.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono truncate max-w-[200px]">{wh.url}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                          {wh.events?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(wh);
                          }}
                          className={`w-8 h-4 rounded-full relative transition-colors ${
                            wh.enabled ? "bg-green-600" : "bg-gray-700"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                              wh.enabled ? "left-4" : "left-0.5"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                        {new Date(wh.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleTest(wh.id)}
                            className="px-2 py-1 text-[11px] font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors"
                          >
                            Test
                          </button>
                          <button
                            onClick={() => handleDelete(wh.id)}
                            className="px-2 py-1 text-[11px] font-medium bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === wh.id && (
                      <tr key={`${wh.id}-detail`}>
                        <td colSpan={6} className="px-4 py-4 bg-gray-900/80 border-b border-gray-800">
                          <div className="mb-3">
                            <span className="text-xs text-gray-500 font-mono">Secret: </span>
                            <span className="text-xs text-gray-300 font-mono">
                              {showSecrets.has(wh.id) ? wh.secret : "****************************"}
                            </span>
                            <button
                              onClick={() => toggleSecretVisibility(wh.id)}
                              className="ml-2 text-[11px] text-blue-400 hover:text-blue-300"
                            >
                              {showSecrets.has(wh.id) ? "Hide" : "Show"}
                            </button>
                          </div>
                          <h4 className="text-xs text-gray-500 font-mono mb-2">Delivery History</h4>
                          {!deliveries[wh.id] || deliveries[wh.id].length === 0 ? (
                            <p className="text-xs text-gray-600">No deliveries yet</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-800">
                                  <th className="text-left px-2 py-1 text-gray-500 font-mono font-normal">Status</th>
                                  <th className="text-left px-2 py-1 text-gray-500 font-mono font-normal">Event</th>
                                  <th className="text-left px-2 py-1 text-gray-500 font-mono font-normal">Response</th>
                                  <th className="text-left px-2 py-1 text-gray-500 font-mono font-normal">Time</th>
                                </tr>
                              </thead>
                              <tbody>
                                {deliveries[wh.id].map((d) => (
                                  <tr key={d.id} className="border-b border-gray-800/50">
                                    <td className="px-2 py-1">
                                      <span
                                        className={`px-1.5 py-0.5 text-[11px] font-mono rounded border ${
                                          d.status === "success"
                                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                                            : "bg-red-500/20 text-red-400 border-red-500/30"
                                        }`}
                                      >
                                        {d.status}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1 text-gray-400 font-mono">{d.eventType}</td>
                                    <td className="px-2 py-1 text-gray-400 font-mono">{d.responseCode ?? "-"}</td>
                                    <td className="px-2 py-1 text-gray-500 font-mono">
                                      {new Date(d.createdAt).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
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
