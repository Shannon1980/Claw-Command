"use client";

import { useState } from "react";
import { BD_STAGES, APP_STAGES, SOURCE_LABELS } from "@/lib/mock-pipeline";
import { OpportunityKanban, ApplicationKanban } from "@/components/pipeline/PipelineKanban";
import PipelineStats from "@/components/pipeline/PipelineStats";
import { usePipeline } from "@/lib/hooks/usePipeline";

type Tab = "bd" | "apps";

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("bd");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const {
    opportunities,
    applications,
    loading,
    error,
    refresh,
    updateOpportunityStage,
    updateApplicationStage,
    passOpportunity,
  } = usePipeline();

  const filteredOpportunities =
    sourceFilter === "all"
      ? opportunities
      : opportunities.filter((o) => o.source === sourceFilter);

  const activeSources = Array.from(
    new Set(opportunities.map((o) => o.source).filter(Boolean))
  );

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/opportunities/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const sourceDetails = (data.sources || [])
          .map(
            (s: { source: string; totalFound: number }) =>
              `${SOURCE_LABELS[s.source]?.label || s.source}: ${s.totalFound} found`
          )
          .join(", ");
        setSyncResult(
          `Synced ${data.inserted} new opportunities. ${sourceDetails}`
        );
        refresh();
      } else {
        setSyncResult(`Sync failed: ${data.error}`);
      }
    } catch (err) {
      setSyncResult(`Sync error: ${String(err)}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 8000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Deals</h1>
            <p className="text-xs text-gray-500 font-mono">
              BD pipeline &amp; app portfolio &mdash; integrated with Ops Engine
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/opportunity-engine"
              className="px-3 py-1.5 text-sm font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-colors"
            >
              Ops Engine
            </a>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync Sources"}
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab("bd")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === "bd"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                }`}
              >
                BD Pipeline
              </button>
              <button
                onClick={() => setActiveTab("apps")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === "apps"
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                }`}
              >
                App Portfolio
              </button>
            </div>
          </div>
        </div>

        {syncResult && (
          <div className="mb-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-mono">
            {syncResult}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
            {error.message}
          </div>
        )}

        {activeTab === "bd" ? (
          <>
            {/* Source Filter */}
            {activeSources.length > 1 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                  Source:
                </span>
                <button
                  onClick={() => setSourceFilter("all")}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    sourceFilter === "all"
                      ? "bg-gray-700 text-gray-200 border-gray-600"
                      : "text-gray-500 border-gray-800 hover:border-gray-600"
                  }`}
                >
                  All ({opportunities.length})
                </button>
                {activeSources.map((src) => {
                  const meta = SOURCE_LABELS[src] || SOURCE_LABELS.manual;
                  const count = opportunities.filter(
                    (o) => o.source === src
                  ).length;
                  return (
                    <button
                      key={src}
                      onClick={() => setSourceFilter(src)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        sourceFilter === src
                          ? meta.color
                          : "text-gray-500 border-gray-800 hover:border-gray-600"
                      }`}
                    >
                      {meta.label} ({count})
                    </button>
                  );
                })}
              </div>
            )}
            <PipelineStats opportunities={filteredOpportunities} />
            <OpportunityKanban
              stages={BD_STAGES}
              opportunities={filteredOpportunities}
              onStageChange={updateOpportunityStage}
              onPass={passOpportunity}
            />
          </>
        ) : (
          <ApplicationKanban
            stages={APP_STAGES}
            applications={applications}
            onStageChange={updateApplicationStage}
          />
        )}
      </div>
    </div>
  );
}
