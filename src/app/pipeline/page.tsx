"use client";

import { useState } from "react";
import {
  mockOpportunities,
  mockApplications,
  BD_STAGES,
  APP_STAGES,
} from "@/lib/mock-pipeline";
import { OpportunityKanban, ApplicationKanban } from "@/components/pipeline/PipelineKanban";
import PipelineStats from "@/components/pipeline/PipelineStats";

type Tab = "bd" | "apps";

export default function PipelinePage() {
  const [activeTab, setActiveTab] = useState<Tab>("bd");

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

          {/* Tab Toggle */}
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

        {activeTab === "bd" ? (
          <>
            <PipelineStats opportunities={mockOpportunities} />
            <OpportunityKanban
              stages={BD_STAGES}
              opportunities={mockOpportunities}
            />
          </>
        ) : (
          <ApplicationKanban
            stages={APP_STAGES}
            applications={mockApplications}
          />
        )}
      </div>
    </div>
  );
}
