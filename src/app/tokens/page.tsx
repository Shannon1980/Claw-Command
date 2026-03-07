"use client";

import { useEffect } from "react";
import { useTokenStore } from "@/lib/stores/tokenStore";

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function TokensPage() {
  const { summary, byAgent, byModel, loading, fetchAll } = useTokenStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-6">
          <h1 className="text-lg font-bold text-gray-100 mb-2">Token Usage</h1>
          <p className="text-xs text-gray-500 font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Token Usage</h1>
            <p className="text-xs text-gray-500 font-mono">Token consumption and cost tracking</p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Total Tokens</div>
            <div className="text-xl font-semibold text-gray-100">
              {summary
                ? (summary.totalInputTokens + summary.totalOutputTokens).toLocaleString()
                : "0"}
            </div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Total Cost</div>
            <div className="text-xl font-semibold text-gray-100">
              {summary ? formatCost(summary.totalCostCents) : "$0.00"}
            </div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Budget Used</div>
            <div className="mb-1">
              <div className="text-xl font-semibold text-gray-100">
                {summary ? `${summary.budgetUsedPct.toFixed(1)}%` : "0%"}
              </div>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  (summary?.budgetUsedPct || 0) > 90
                    ? "bg-red-500"
                    : (summary?.budgetUsedPct || 0) > 70
                      ? "bg-amber-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${Math.min(summary?.budgetUsedPct || 0, 100)}%` }}
              />
            </div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Budget Remaining</div>
            <div className="text-xl font-semibold text-gray-100">
              {summary ? formatCost(summary.budgetRemainingCents) : "$0.00"}
            </div>
          </div>
        </div>

        {/* Daily chart placeholder */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-300 mb-2">Daily Usage</h2>
          <div className="h-40 flex items-center justify-center border border-dashed border-gray-700 rounded-lg">
            <p className="text-xs text-gray-500 font-mono">Chart: Daily token usage over 30 days</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Per-agent table */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-medium text-gray-300">By Agent</h2>
            </div>
            {byAgent.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-gray-500">No agent token data yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-2 text-xs text-gray-500 font-mono font-normal">Agent</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-mono font-normal">Input</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-mono font-normal">Output</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-mono font-normal">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {byAgent.map((a) => (
                    <tr key={a.agentId} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-4 py-2 text-xs text-gray-300">
                        <span className="mr-1">{a.agentEmoji}</span>
                        {a.agentName}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400 font-mono text-right">
                        {a.inputTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400 font-mono text-right">
                        {a.outputTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-300 font-mono text-right">
                        {formatCost(a.costCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Per-model table */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-medium text-gray-300">By Model</h2>
            </div>
            {byModel.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-gray-500">No model token data yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-2 text-xs text-gray-500 font-mono font-normal">Model</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-mono font-normal">Input</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-mono font-normal">Output</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-mono font-normal">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {byModel.map((m) => (
                    <tr key={m.model} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-4 py-2 text-xs text-gray-300 font-mono">{m.model}</td>
                      <td className="px-4 py-2 text-xs text-gray-400 font-mono text-right">
                        {m.inputTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400 font-mono text-right">
                        {m.outputTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-300 font-mono text-right">
                        {formatCost(m.costCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Budget config note */}
        <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-300 mb-2">Budget Configuration</h2>
          <p className="text-xs text-gray-500 font-mono">
            Budget settings are configured via environment variables: TOKEN_BUDGET_MONTHLY_CENTS, TOKEN_BUDGET_ALERT_PCT.
            Current values are reflected in the summary cards above.
          </p>
        </div>
      </div>
    </div>
  );
}
