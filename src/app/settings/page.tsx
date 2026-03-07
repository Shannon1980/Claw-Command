"use client";

import { useEffect, useState } from "react";

interface Settings {
  gateway?: {
    url?: string;
    status?: string;
  };
  auth?: {
    user?: string;
  };
  budget?: {
    monthlyCents?: number;
    alertThresholdPct?: number;
  };
  [key: string]: unknown;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<string | null>(null);
  const [testingGateway, setTestingGateway] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
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
    };
    fetchSettings();
  }, []);

  const testGateway = async () => {
    setTestingGateway(true);
    setGatewayStatus(null);
    try {
      const res = await fetch("/api/gateway/status");
      if (res.ok) {
        const data = await res.json();
        setGatewayStatus(data.status || "connected");
      } else {
        setGatewayStatus("unreachable");
      }
    } catch {
      setGatewayStatus("error");
    } finally {
      setTestingGateway(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[900px] mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-100">Settings</h1>
          <p className="text-xs text-gray-500 font-mono">System configuration (read-only)</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-6">
            {/* Gateway */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h2 className="text-sm font-medium text-gray-300 mb-3">Gateway</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-mono">URL</p>
                    <p className="text-xs text-gray-300 font-mono">{settings?.gateway?.url || "Not configured"}</p>
                  </div>
                  <button
                    onClick={testGateway}
                    disabled={testingGateway}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors disabled:opacity-50"
                  >
                    {testingGateway ? "Testing..." : "Test Connection"}
                  </button>
                </div>
                {gatewayStatus && (
                  <p className={`text-xs font-mono ${gatewayStatus === "connected" ? "text-green-400" : "text-red-400"}`}>
                    Status: {gatewayStatus}
                  </p>
                )}
              </div>
            </div>

            {/* Auth */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h2 className="text-sm font-medium text-gray-300 mb-3">Authentication</h2>
              <div>
                <p className="text-xs text-gray-500 font-mono">Current User</p>
                <p className="text-xs text-gray-300 font-mono">{settings?.auth?.user || "Not authenticated"}</p>
              </div>
            </div>

            {/* Budget */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h2 className="text-sm font-medium text-gray-300 mb-3">Token Budget</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-mono">Monthly Budget</p>
                  <p className="text-xs text-gray-300 font-mono">
                    {settings?.budget?.monthlyCents
                      ? `$${(settings.budget.monthlyCents / 100).toFixed(2)}`
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-mono">Alert Threshold</p>
                  <p className="text-xs text-gray-300 font-mono">
                    {settings?.budget?.alertThresholdPct
                      ? `${settings.budget.alertThresholdPct}%`
                      : "Not set"}
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
