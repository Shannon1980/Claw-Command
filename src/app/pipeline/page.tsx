"use client";

import { useMemo, useState } from "react";
import { BD_STAGES, APP_STAGES } from "@/lib/pipeline/config";
import { OpportunityKanban, ApplicationKanban } from "@/components/pipeline/PipelineKanban";
import PipelineStats from "@/components/pipeline/PipelineStats";
import { usePipeline } from "@/lib/hooks/usePipeline";

type Tab = "bd" | "apps";

export default function PipelinePage() {
  const [activeTab, setActiveTab] = useState<Tab>("bd");
  const {
    opportunities,
    applications,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
    updateOpportunityStage,
    updateApplicationStage,
  } = usePipeline();

  const hasBdData = opportunities.length > 0;
  const hasAppData = applications.length > 0;
  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return "Never";
    return new Date(lastUpdated).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lastUpdated]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Pipeline</h1>
            <p className="text-xs text-gray-500 font-mono">
              Business development &amp; application portfolio
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-[10px] font-mono text-gray-500">
              Last updated: {lastUpdatedLabel}
            </div>
            <button
              onClick={refresh}
              disabled={loading || refreshing}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading || refreshing ? "Loading…" : "Refresh"}
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
                💼 BD Pipeline
              </button>
              <button
                onClick={() => setActiveTab("apps")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === "apps"
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                }`}
              >
                📱 App Portfolio
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex items-center justify-between gap-3">
            <span>{error.message}</span>
            <button onClick={refresh} className="text-xs underline underline-offset-2">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-8 border border-gray-800 rounded-lg bg-gray-900/40 text-sm text-gray-400">
            Loading pipeline data...
          </div>
        ) : activeTab === "bd" ? (
          hasBdData ? (
            <>
              <PipelineStats opportunities={opportunities} />
              <OpportunityKanban
                stages={BD_STAGES}
                opportunities={opportunities}
                onStageChange={updateOpportunityStage}
              />
            </>
          ) : (
            <div className="p-8 border border-gray-800 rounded-lg bg-gray-900/40 text-sm text-gray-400">
              No opportunities yet. Run a sync from Deals or push opportunities from the Opportunity Engine.
            </div>
          )
        ) : hasAppData ? (
          <ApplicationKanban
            stages={APP_STAGES}
            applications={applications}
            onStageChange={updateApplicationStage}
          />
        ) : (
          <div className="p-8 border border-gray-800 rounded-lg bg-gray-900/40 text-sm text-gray-400">
            No application portfolio items yet.
          </div>
        )}
      </div>
    </div>
  );
}
