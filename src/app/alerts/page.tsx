"use client";

import { useEffect, useState } from "react";

interface Alert {
  id: string;
  title: string;
  severity: "critical" | "warning" | "info";
  triggerType: string;
  dueDate: string | null;
  createdAt: string;
  dismissed: boolean;
}

interface AlertRule {
  id: string;
  name: string;
  conditionType: string;
  threshold: number | string;
  channels: string[];
  enabled: boolean;
  lastFired: string | null;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const conditionTypes = [
  "deadline_approaching",
  "budget_threshold",
  "agent_offline",
  "error_rate",
];

const channelOptions = ["dashboard", "webhook", "email"];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleFormData, setRuleFormData] = useState({
    name: "",
    conditionType: "deadline_approaching",
    threshold: "",
    channels: new Set<string>(["dashboard"]),
    enabled: true,
  });

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch {
      // silent
    }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/alert-rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAlerts(), fetchRules()]).finally(() => setLoading(false));
  }, []);

  const handleDismiss = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}/dismiss`, { method: "POST" });
      fetchAlerts();
    } catch {
      // silent
    }
  };

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      await fetch(`/api/alert-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      fetchRules();
    } catch {
      // silent
    }
  };

  const toggleChannel = (ch: string) => {
    const next = new Set(ruleFormData.channels);
    if (next.has(ch)) next.delete(ch);
    else next.add(ch);
    setRuleFormData({ ...ruleFormData, channels: next });
  };

  const handleAddRule = async () => {
    setError(null);
    try {
      const res = await fetch("/api/alert-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ruleFormData.name,
          conditionType: ruleFormData.conditionType,
          threshold: ruleFormData.threshold,
          channels: [...ruleFormData.channels],
          enabled: ruleFormData.enabled,
        }),
      });
      if (!res.ok) throw new Error("Failed to create rule");
      setShowRuleForm(false);
      setRuleFormData({
        name: "",
        conditionType: "deadline_approaching",
        threshold: "",
        channels: new Set(["dashboard"]),
        enabled: true,
      });
      fetchRules();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const activeAlerts = alerts.filter((a) => !a.dismissed);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-100">Alerts</h1>
          <p className="text-xs text-gray-500 font-mono">Active alerts and alert rules</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-8">
            {/* Active Alerts */}
            <div>
              <h2 className="text-sm font-medium text-gray-300 mb-3">Active Alerts</h2>
              {activeAlerts.length === 0 ? (
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-500">No active alerts</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeAlerts.map((alert) => (
                    <div key={alert.id} className="bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-[11px] font-mono rounded border ${severityColors[alert.severity] || severityColors.info}`}>
                          {alert.severity}
                        </span>
                        <span className="text-sm text-gray-200">{alert.title}</span>
                        <span className="text-[11px] text-gray-500 font-mono">{alert.triggerType}</span>
                        {alert.dueDate && (
                          <span className="text-[11px] text-gray-500 font-mono">
                            Due: {new Date(alert.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-600 font-mono">
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="px-2 py-1 text-[11px] font-medium bg-gray-800 text-gray-400 hover:text-gray-200 rounded transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alert Rules */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-300">Alert Rules</h2>
                <button
                  onClick={() => setShowRuleForm(!showRuleForm)}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                >
                  {showRuleForm ? "Cancel" : "Add Rule"}
                </button>
              </div>

              {showRuleForm && (
                <div className="mb-4 bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 font-mono mb-1">Name</label>
                      <input
                        type="text"
                        value={ruleFormData.name}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 font-mono mb-1">Condition Type</label>
                      <select
                        value={ruleFormData.conditionType}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, conditionType: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
                      >
                        {conditionTypes.map((ct) => (
                          <option key={ct} value={ct}>{ct}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 font-mono mb-1">Threshold</label>
                      <input
                        type="text"
                        value={ruleFormData.threshold}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, threshold: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 font-mono mb-1">Channels</label>
                    <div className="flex gap-2">
                      {channelOptions.map((ch) => (
                        <button
                          key={ch}
                          onClick={() => toggleChannel(ch)}
                          className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                            ruleFormData.channels.has(ch)
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              : "bg-gray-900 text-gray-500 border-gray-800"
                          }`}
                        >
                          {ch}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="rule-enabled"
                      checked={ruleFormData.enabled}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, enabled: e.target.checked })}
                      className="rounded bg-gray-900 border-gray-700"
                    />
                    <label htmlFor="rule-enabled" className="text-xs text-gray-400 font-mono">Enabled</label>
                  </div>
                  <button
                    onClick={handleAddRule}
                    className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
                  >
                    Create Rule
                  </button>
                </div>
              )}

              {rules.length === 0 ? (
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-500">No alert rules configured</p>
                </div>
              ) : (
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Name</th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Condition</th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Channels</th>
                        <th className="text-center px-4 py-3 text-xs text-gray-500 font-mono font-normal">Enabled</th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-mono font-normal">Last Fired</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((rule) => (
                        <tr key={rule.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                          <td className="px-4 py-3 text-xs text-gray-300">{rule.name}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                            {rule.conditionType} ({String(rule.threshold)})
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {(rule.channels || []).map((ch) => (
                                <span key={ch} className="px-1.5 py-0.5 text-[11px] font-mono bg-gray-800 text-gray-400 rounded">
                                  {ch}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleToggleRule(rule)}
                              className={`w-8 h-4 rounded-full relative transition-colors ${
                                rule.enabled ? "bg-green-600" : "bg-gray-700"
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                                  rule.enabled ? "left-4" : "left-0.5"
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                            {rule.lastFired ? new Date(rule.lastFired).toLocaleString() : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
