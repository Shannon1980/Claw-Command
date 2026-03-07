"use client";

import { useState } from "react";
import { BD_STAGES, APP_STAGES } from "@/lib/mock-pipeline";
import { OpportunityKanban, ApplicationKanban } from "@/components/pipeline/PipelineKanban";
import PipelineStats from "@/components/pipeline/PipelineStats";
import { usePipeline } from "@/lib/hooks/usePipeline";

type Tab = "bd" | "apps";

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("bd");
  const {
    opportunities,
    applications,
    loading,
    error,
    refresh,
    updateOpportunityStage,
    updateApplicationStage,
  } = usePipeline();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Deals</h1>
            <p className="text-xs text-gray-500 font-mono">
              Business development &amp; application portfolio
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
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
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
            {error.message}
          </div>
        )}

        {activeTab === "bd" ? (
          <>
            <PipelineStats opportunities={opportunities} />
            <OpportunityKanban
              stages={BD_STAGES}
              opportunities={opportunities}
              onStageChange={updateOpportunityStage}
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
