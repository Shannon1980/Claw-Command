"use client";

import { useEffect, useState } from "react";

type TokenMetrics = {
  connected: boolean;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  byModel: Record<string, number>;
  toolsInvoked: number;
  error?: string;
};

export default function TokensPage() {
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tokens");
      const data = await res.json();
      setMetrics(data);
    } catch {
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">📊 Token & Cost Tracking</h1>
          <p className="text-gray-400 mb-6">Loading usage data from OpenClaw gateway…</p>
          <div className="animate-pulse h-32 bg-gray-900/50 rounded-lg" />
        </div>
      </div>
    );
  }

  const m = metrics;
  const hasData = m && (m.totalTokens > 0 || m.promptTokens > 0 || m.completionTokens > 0 || Object.keys(m.byModel || {}).length > 0);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">📊 Token & Cost Tracking</h1>
            <p className="text-gray-400">
              Usage data from OpenClaw Prometheus metrics (openclaw@3.7.2+).
            </p>
          </div>
          {m?.connected && hasData && (
            <button
              onClick={load}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50"
            >
              Refresh
            </button>
          )}
        </div>

        {!m?.connected || !hasData ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8">
            <div className="flex justify-end mb-2">
              <button
                onClick={load}
                disabled={loading}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-300 bg-gray-800/50 hover:bg-gray-800 rounded disabled:opacity-50"
              >
                Retry
              </button>
            </div>
            <div className="text-4xl mb-4">🔌</div>
            <h2 className="text-lg font-medium text-gray-300 mb-2">
              {m?.connected ? "No usage data yet" : "Connect OpenClaw gateway"}
            </h2>
            <p className="text-sm text-gray-500 max-w-md mb-4">
              {m?.error ||
                "Token tracking requires OpenClaw gateway integration. Enable Prometheus metrics in gateway.config.mjs:"}
            </p>
            <pre className="text-xs text-gray-600 bg-gray-950 p-4 rounded overflow-x-auto">
{`metrics: {
  enabled: true,
  port: 9464
}`}
            </pre>
            <p className="text-sm text-gray-500 mt-4">
              Set <code className="text-gray-400">OPENCLAW_METRICS_URL</code> (e.g.{" "}
              <code className="text-gray-400">http://localhost:9464/metrics</code>) or{" "}
              <code className="text-gray-400">OPENCLAW_URL</code> for auto-detection.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total tokens</div>
                <div className="text-xl font-semibold text-gray-100">
                  {m.totalTokens.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Prompt</div>
                <div className="text-xl font-semibold text-gray-100">
                  {m.promptTokens.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Completion</div>
                <div className="text-xl font-semibold text-gray-100">
                  {m.completionTokens.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tools invoked</div>
                <div className="text-xl font-semibold text-gray-100">
                  {m.toolsInvoked.toLocaleString()}
                </div>
              </div>
            </div>

            {Object.keys(m.byModel || {}).length > 0 && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">By model</h3>
                <ul className="space-y-2">
                  {Object.entries(m.byModel)
                    .sort(([, a], [, b]) => b - a)
                    .map(([model, count]) => (
                      <li
                        key={model}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-gray-300">{model}</span>
                        <span className="text-gray-100 font-mono">
                          {count.toLocaleString()} tokens
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-gray-600">
              Data from OpenClaw Prometheus metrics. For cost estimates, use /usage cost in chat or
              configure model pricing in your monitoring stack.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
