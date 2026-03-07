"use client";

import { useState } from "react";
import { useOpportunityEngine } from "@/lib/hooks/useOpportunityEngine";
import type { QualifiedOpportunity, ActionRouting } from "@/lib/opportunity-engine/types";

type ViewTab = "capture" | "teaming" | "watch" | "all";

function ActionBadge({ action }: { action: ActionRouting }) {
  const styles: Record<ActionRouting, string> = {
    CAPTURE_NOW: "bg-green-500/20 text-green-400 border-green-500/30",
    CAPTURE_NOW_TEAM_SKYWARD: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    WATCH: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    PASS: "bg-gray-500/20 text-gray-500 border-gray-500/30",
  };
  const labels: Record<ActionRouting, string> = {
    CAPTURE_NOW: "CAPTURE NOW",
    CAPTURE_NOW_TEAM_SKYWARD: "TEAM W/ SKYWARD",
    WATCH: "WATCH",
    PASS: "PASS",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${styles[action]}`}>
      {labels[action]}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  return channel === "teaming" ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
      Teaming
    </span>
  ) : (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
      Direct
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = {
    sam_gov: "SAM.gov",
    fpds_ng: "FPDS-NG",
    emaryland: "eMaryland",
    eva_virginia: "eVA",
    dc_ocp: "DC OCP",
    naspo: "NASPO",
  };
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 font-mono">
      {labels[source] || source}
    </span>
  );
}

function formatUsd(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-gray-400 w-8 text-right">
        {typeof value === "number" && max === 10 ? value.toFixed(1) : `${Math.round(value)}%`}
      </span>
    </div>
  );
}

function OpportunityDetailCard({ opp }: { opp: QualifiedOpportunity }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-sm font-medium text-gray-200 leading-tight flex-1">{opp.title}</h4>
        <ActionBadge action={opp.action} />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-lg font-bold text-cyan-400 font-mono">{formatUsd(opp.amount)}</span>
        <ChannelBadge channel={opp.channel} />
        <SourceBadge source={opp.source} />
        {opp.solicitationNumber && (
          <span className="text-[10px] font-mono text-gray-500">#{opp.solicitationNumber}</span>
        )}
      </div>

      <div className="text-xs text-gray-400 mb-3">{opp.agency}</div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <ScoreBar label="Fit" value={opp.fitScore} max={10} color="bg-gradient-to-r from-blue-500 to-cyan-400" />
        <ScoreBar label="Win %" value={opp.winProbability} max={100} color="bg-gradient-to-r from-green-500 to-emerald-400" />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={`font-mono ${opp.daysUntilClose <= 45 ? "text-amber-400" : "text-gray-500"}`}>
          {opp.daysUntilClose}d until close
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          {expanded ? "Less" : "Details"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
          {opp.description && (
            <p className="text-xs text-gray-400 leading-relaxed">{opp.description}</p>
          )}

          {opp.winThemes.length > 0 && (
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Win Themes</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {opp.winThemes.map((theme, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Fit Breakdown</span>
              <div className="mt-1 space-y-1">
                <ScoreBar label="NAICS" value={opp.fitBreakdown.naicsMatch} max={10} color="bg-blue-500" />
                <ScoreBar label="Size" value={opp.fitBreakdown.sizeEligibility} max={10} color="bg-blue-500" />
                <ScoreBar label="Cap" value={opp.fitBreakdown.capabilityMatch} max={10} color="bg-blue-500" />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Win Breakdown</span>
              <div className="mt-1 space-y-1">
                <ScoreBar label="Hist" value={opp.winBreakdown.historicalWinRate} max={100} color="bg-green-500" />
                <ScoreBar label="Comp" value={opp.winBreakdown.competitiveIntensity} max={100} color="bg-green-500" />
                <ScoreBar label="Seg" value={opp.winBreakdown.segmentFamiliarity} max={100} color="bg-green-500" />
              </div>
            </div>
          </div>

          {opp.naicsCodes.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-gray-500">NAICS:</span>
              {opp.naicsCodes.map((code) => (
                <span key={code} className="text-[10px] font-mono px-1 py-0.5 rounded bg-gray-800 text-gray-400">
                  {code}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span>Deadline: {opp.deadline || "N/A"}</span>
            <span>Set-aside: {opp.setAsideType || "N/A"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3">
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

export default function OpportunityEnginePage() {
  const { queue, loading, scanning, error, refresh, triggerScan } = useOpportunityEngine();
  const [activeTab, setActiveTab] = useState<ViewTab>("capture");

  const getTabOpps = (): QualifiedOpportunity[] => {
    switch (activeTab) {
      case "capture":
        return queue.captureNowDirect;
      case "teaming":
        return queue.captureNowTeaming;
      case "watch":
        return queue.watch;
      case "all":
        return [
          ...queue.captureNowDirect,
          ...queue.captureNowTeaming,
          ...queue.watch,
          ...queue.pass,
        ];
    }
  };

  const tabOpps = getTabOpps();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Opportunity Engine</h1>
            <p className="text-xs text-gray-500 font-mono">
              Qualification & routing for Vorentoe + Skyward teaming
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={triggerScan}
              disabled={scanning}
              className="px-3 py-1.5 text-sm bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50 font-mono"
            >
              {scanning ? "Scanning..." : "Scan Sources"}
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
            {error.message}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatsCard label="Capture Now (Direct)" value={queue.captureNowDirect.length} color="text-green-400" />
          <StatsCard label="Team w/ Skyward" value={queue.captureNowTeaming.length} color="text-cyan-400" />
          <StatsCard label="Watch" value={queue.watch.length} color="text-amber-400" />
          <StatsCard label="Total Scanned" value={queue.totalScanned} color="text-gray-400" />
        </div>

        {/* Routing Rules Reference */}
        <div className="mb-6 p-3 bg-gray-900/40 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
            <span className="text-gray-400 font-bold">ROUTING:</span>
            <span>
              <span className="text-green-400">CAPTURE</span> = Fit 8+ / Win 55%+ / 45d+
            </span>
            <span>
              <span className="text-cyan-400">TEAM SKYWARD</span> = Fit 6+ / Win 40%+ / 45d+ (Federal)
            </span>
            <span>
              <span className="text-amber-400">WATCH</span> = Below threshold, monitor
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5 mb-6 w-fit">
          {([
            { key: "capture" as ViewTab, label: "Capture Now", count: queue.captureNowDirect.length, color: "green" },
            { key: "teaming" as ViewTab, label: "Team Skyward", count: queue.captureNowTeaming.length, color: "cyan" },
            { key: "watch" as ViewTab, label: "Watch", count: queue.watch.length, color: "amber" },
            { key: "all" as ViewTab, label: "All", count: queue.totalScanned, color: "gray" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === tab.key
                  ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-500/30`
                  : "text-gray-500 hover:text-gray-300 border border-transparent"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] font-mono opacity-60">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Opportunity List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tabOpps.map((opp) => (
            <OpportunityDetailCard key={opp.id} opp={opp} />
          ))}
        </div>

        {tabOpps.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-600">
            <p className="text-sm">No opportunities in this queue.</p>
            <p className="text-xs mt-1 font-mono">Run a scan or switch tabs.</p>
          </div>
        )}

        {/* Last Scan */}
        <div className="mt-6 text-[10px] font-mono text-gray-600 text-center">
          Last scan: {new Date(queue.lastScanAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
