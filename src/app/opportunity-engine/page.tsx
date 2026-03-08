"use client";

import { useState, useEffect } from "react";
import { useOpportunityEngine } from "@/lib/hooks/useOpportunityEngine";
import type { QualifiedOpportunity, ActionRouting } from "@/lib/opportunity-engine/types";
import type { OpportunityAnalysis } from "@/lib/opportunity-engine/analyze";
import type { RiskLevel } from "@/lib/opportunity-engine/risk-assessment";

type ViewTab = "capture" | "team_skyward" | "team_vorentoe" | "watch" | "all";
type PageMode = "pipeline" | "analyze";

// ─── Shared Components ─────────────────────────────────────────────────────

function ActionBadge({ action }: { action: ActionRouting }) {
  const styles: Record<ActionRouting, string> = {
    CAPTURE_NOW: "bg-green-500/20 text-green-400 border-green-500/30",
    CAPTURE_NOW_TEAM_SKYWARD: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    CAPTURE_NOW_TEAM_VORENTOE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    WATCH: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    PASS: "bg-gray-500/20 text-gray-500 border-gray-500/30",
  };
  const labels: Record<ActionRouting, string> = {
    CAPTURE_NOW: "CAPTURE NOW",
    CAPTURE_NOW_TEAM_SKYWARD: "TEAM SKYWARD",
    CAPTURE_NOW_TEAM_VORENTOE: "TEAM VORENTOE",
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
  if (channel === "teaming_skyward_prime") {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Skyward Prime</span>;
  }
  if (channel === "teaming_vorentoe_prime") {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">Vorentoe Prime</span>;
  }
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Direct</span>;
}

function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = { sam_gov: "SAM.gov", montgomery_county_md: "MoCo MD", emma_msrb: "EMMA/MSRB", fpds_ng: "FPDS-NG", emaryland: "eMaryland", eva_virginia: "eVA", dc_ocp: "DC OCP", naspo: "NASPO" };
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 font-mono">{labels[source] || source}</span>;
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
        {max === 10 ? value.toFixed(1) : `${Math.round(value)}%`}
      </span>
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

function RiskBadge({ level }: { level: RiskLevel }) {
  const styles: Record<RiskLevel, string> = {
    LOW: "bg-green-500/20 text-green-400 border-green-500/30",
    "LOW-MODERATE": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    MODERATE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    VERY_HIGH: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${styles[level]}`}>{level.replace(/_/g, " ")}</span>;
}

function ThreatBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    VERY_HIGH: "text-red-400",
    HIGH: "text-orange-400",
    MEDIUM: "text-amber-400",
    LOW: "text-green-400",
  };
  return <span className={`text-[10px] font-mono font-bold ${styles[level] || "text-gray-400"}`}>{level}</span>;
}

// ─── Pipeline Opportunity Card ─────────────────────────────────────────────

function OpportunityDetailCard({ opp }: { opp: QualifiedOpportunity }) {
  const [expanded, setExpanded] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string } | null>(null);

  const handlePushToDeals = async () => {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch("/api/opportunity-engine/push-to-deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opp.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setPushResult({ success: true, message: data.message || "Pushed to deals pipeline" });
      } else {
        setPushResult({ success: false, message: data.error || "Push failed" });
      }
    } catch (err) {
      setPushResult({ success: false, message: String(err) });
    } finally {
      setPushing(false);
      setTimeout(() => setPushResult(null), 5000);
    }
  };

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-sm font-medium text-gray-200 leading-tight flex-1">
          {opp.sourceUrl ? (
            <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">
              {opp.title}
            </a>
          ) : (
            opp.title
          )}
        </h4>
        <ActionBadge action={opp.action} />
      </div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-lg font-bold text-cyan-400 font-mono">{formatUsd(opp.amount)}</span>
        <ChannelBadge channel={opp.channel} />
        <SourceBadge source={opp.source} />
        {opp.solicitationNumber && <span className="text-[10px] font-mono text-gray-500">#{opp.solicitationNumber}</span>}
      </div>
      <div className="text-xs text-gray-400 mb-3">{opp.agency}</div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <ScoreBar label="Fit" value={opp.fitScore} max={10} color="bg-gradient-to-r from-blue-500 to-cyan-400" />
        <ScoreBar label="Win %" value={opp.winProbability} max={100} color="bg-gradient-to-r from-green-500 to-emerald-400" />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={`font-mono ${opp.daysUntilClose <= 45 ? "text-amber-400" : "text-gray-500"}`}>{opp.daysUntilClose}d until close</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePushToDeals}
            disabled={pushing}
            className="text-[10px] px-2 py-0.5 rounded border font-mono font-medium bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            {pushing ? "Sending..." : "Send to Deals"}
          </button>
          <a href="/deals" className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors font-mono">
            View Deals
          </a>
          <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-gray-300 transition-colors">{expanded ? "Less" : "Details"}</button>
        </div>
      </div>

      {/* Push result feedback */}
      {pushResult && (
        <div className={`mt-2 text-[10px] font-mono px-2 py-1 rounded ${pushResult.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
          {pushResult.message}
        </div>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
          {opp.description && <p className="text-xs text-gray-400 leading-relaxed">{opp.description}</p>}

          {/* Source URL */}
          {opp.sourceUrl && (
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Source Link</span>
              <div className="mt-1">
                <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors break-all">
                  {opp.sourceUrl} &rarr;
                </a>
              </div>
            </div>
          )}

          {opp.winThemes.length > 0 && (
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Win Themes</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {opp.winThemes.map((theme, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">{theme}</span>
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
              {opp.naicsCodes.map((code) => <span key={code} className="text-[10px] font-mono px-1 py-0.5 rounded bg-gray-800 text-gray-400">{code}</span>)}
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

// ─── RFQ Analysis Form ─────────────────────────────────────────────────────

interface AnalysisFormData {
  opportunityId: string;
  title: string;
  agency: string;
  sector: "federal" | "state" | "local";
  scope: string;
  description: string;
  estimatedBudget: string;
  setAsides: string;
  timeline: "urgent" | "normal" | "long";
  pastPerformance: boolean;
  securityRequirement: string;
}

const EMPTY_FORM: AnalysisFormData = {
  opportunityId: "",
  title: "",
  agency: "",
  sector: "federal",
  scope: "",
  description: "",
  estimatedBudget: "",
  setAsides: "none",
  timeline: "normal",
  pastPerformance: false,
  securityRequirement: "medium",
};

function AnalyzePanel() {
  const [form, setForm] = useState<AnalysisFormData>(EMPTY_FORM);
  const [analysis, setAnalysis] = useState<OpportunityAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch("/api/opportunity-engine/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimatedBudget: Number(form.estimatedBudget.replace(/[$,]/g, "")) || 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }
      setAnalysis(await res.json());
    } catch (err) {
      setAnalysisError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateField = <K extends keyof AnalysisFormData>(key: K, value: AnalysisFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const inputCls = "w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 placeholder-gray-600";
  const labelCls = "block text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1";

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-bold text-gray-200 mb-4">Analyze RFQ / Opportunity</h3>
        <p className="text-xs text-gray-500 mb-4">Paste RFQ details to get win theme suggestions, competitor intel, and risk assessment.</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>Opportunity ID *</label>
            <input className={inputCls} placeholder="SAM-12345 or custom" value={form.opportunityId} onChange={(e) => updateField("opportunityId", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Title *</label>
            <input className={inputCls} placeholder="RFQ title from SAM or customer" value={form.title} onChange={(e) => updateField("title", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className={labelCls}>Agency *</label>
            <input className={inputCls} placeholder="USDA, DoD, HHS, etc." value={form.agency} onChange={(e) => updateField("agency", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Sector</label>
            <select className={inputCls} value={form.sector} onChange={(e) => updateField("sector", e.target.value as AnalysisFormData["sector"])}>
              <option value="federal">Federal</option>
              <option value="state">State</option>
              <option value="local">Local</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Estimated Budget *</label>
            <input className={inputCls} placeholder="$500,000" value={form.estimatedBudget} onChange={(e) => updateField("estimatedBudget", e.target.value)} />
          </div>
        </div>

        <div className="mb-4">
          <label className={labelCls}>Scope / Category *</label>
          <input className={inputCls} placeholder="COBOL-modernization, cloud-migration, AI-ML, data-analytics, etc." value={form.scope} onChange={(e) => updateField("scope", e.target.value)} />
        </div>

        <div className="mb-4">
          <label className={labelCls}>Description / RFQ Excerpt *</label>
          <textarea className={`${inputCls} h-24 resize-y`} placeholder="Paste buyer pain, requirements, challenges from RFQ..." value={form.description} onChange={(e) => updateField("description", e.target.value)} />
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className={labelCls}>Set-Asides</label>
            <select className={inputCls} value={form.setAsides} onChange={(e) => updateField("setAsides", e.target.value)}>
              <option value="none">None</option>
              <option value="EDWOSB">EDWOSB</option>
              <option value="WOSB">WOSB</option>
              <option value="8(a)">8(a)</option>
              <option value="Small Business">Small Business</option>
              <option value="HUBZone">HUBZone</option>
              <option value="SDVOSB">SDVOSB</option>
              <option value="MBE">MBE</option>
              <option value="LSBRP">LSBRP</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Timeline</label>
            <select className={inputCls} value={form.timeline} onChange={(e) => updateField("timeline", e.target.value as AnalysisFormData["timeline"])}>
              <option value="urgent">Urgent (&lt;30d)</option>
              <option value="normal">Normal (30-90d)</option>
              <option value="long">Long (90d+)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Security</label>
            <select className={inputCls} value={form.securityRequirement} onChange={(e) => updateField("securityRequirement", e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="CMMC">CMMC</option>
              <option value="FedRAMP">FedRAMP</option>
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={form.pastPerformance} onChange={(e) => updateField("pastPerformance", e.target.checked)} className="rounded border-gray-600 bg-gray-800 text-cyan-500" />
              Past performance
            </label>
          </div>
        </div>

        {analysisError && (
          <div className="mb-4 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{analysisError}</div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={analyzing || !form.opportunityId || !form.title || !form.agency || !form.scope || !form.description}
          className="px-4 py-2 text-sm font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-40 font-mono"
        >
          {analyzing ? "Analyzing..." : "Analyze Opportunity"}
        </button>
      </div>

      {/* Analysis Results */}
      {analysis && <AnalysisResults analysis={analysis} />}
    </div>
  );
}

// ─── Analysis Results Display ──────────────────────────────────────────────

function AnalysisResults({ analysis }: { analysis: OpportunityAnalysis }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-200">{analysis.title}</h3>
          <RiskBadge level={analysis.riskAssessment.riskLevel} />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{analysis.agency}</span>
          <span className="text-gray-700">|</span>
          <span>{analysis.scope}</span>
          <span className="text-gray-700">|</span>
          <span>Analyzed {analysis.analysisDate}</span>
        </div>
      </div>

      {/* Buyer Profile */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
        <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">Buyer Profile</h4>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-200">{analysis.buyerProfile.buyerType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">Budget: {analysis.buyerProfile.budgetSensitivity}</span>
        </div>
        <p className="text-xs text-gray-400 mb-2">{analysis.buyerProfile.messagingTone}</p>
        <div className="flex flex-wrap gap-1">
          {analysis.buyerProfile.priorities.map((p, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{p}</span>
          ))}
        </div>
      </div>

      {/* Vorentoe Advantage Scores */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
        <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">Vorentoe Advantage Scores</h4>
        <div className="space-y-2">
          <ScoreBar label="EDWOSB" value={analysis.vorentoeAdvantageScores.edwosbAgility} max={10} color="bg-gradient-to-r from-purple-500 to-pink-400" />
          <ScoreBar label="Modern" value={analysis.vorentoeAdvantageScores.modernStackGovExpertise} max={10} color="bg-gradient-to-r from-blue-500 to-cyan-400" />
          <ScoreBar label="US-Based" value={analysis.vorentoeAdvantageScores.usBasedLowerCost} max={10} color="bg-gradient-to-r from-green-500 to-emerald-400" />
          <ScoreBar label="Special" value={analysis.vorentoeAdvantageScores.specializedModernization} max={10} color="bg-gradient-to-r from-amber-500 to-orange-400" />
        </div>
      </div>

      {/* Win Themes */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
        <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">Suggested Win Themes</h4>
        <div className="space-y-4">
          {analysis.suggestedWinThemes.map((theme) => (
            <div key={theme.rank} className="border border-gray-800 rounded-lg p-3 bg-gray-950/50">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">#{theme.rank}</span>
                  <h5 className="text-sm font-medium text-gray-200">{theme.theme}</h5>
                </div>
                <span className="text-[10px] font-mono text-gray-400 shrink-0">Score: {theme.scoreRelevance} | Win: {theme.estimatedWinProbability}</span>
              </div>
              <p className="text-xs text-gray-400 mb-2 italic">{theme.headline}</p>
              <div className="mb-2">
                <span className="text-[10px] font-mono text-gray-500">KEY MESSAGES:</span>
                <ul className="mt-1 space-y-0.5">
                  {theme.keyMessages.map((msg, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                      <span className="text-cyan-500 mt-0.5 shrink-0">-</span>
                      {msg}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-gray-500 pt-2 border-t border-gray-800">
                <span>vs <span className="text-amber-400 font-medium">{theme.competitiveVs.competitor}</span></span>
                <span>Ours: <span className="text-green-400">{theme.competitiveVs.ourStrength}</span></span>
                <span>Theirs: <span className="text-red-400">{theme.competitiveVs.theirWeakness}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Competitor Intel */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
        <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">Competitor Intelligence</h4>
        {analysis.competitorIntel.primaryThreat && (
          <div className="mb-3 p-2 rounded bg-red-500/5 border border-red-500/20">
            <span className="text-[10px] font-mono text-red-400">PRIMARY THREAT: </span>
            <span className="text-sm text-gray-200 font-medium">{analysis.competitorIntel.primaryThreat}</span>
            {analysis.competitorIntel.competitorArchetype && (
              <span className="text-[10px] text-gray-500 ml-2">({analysis.competitorIntel.competitorArchetype.replace(/-/g, " ")})</span>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] font-mono text-gray-500">LIKELY BIDDERS</span>
            <div className="mt-1 space-y-1">
              {analysis.competitorIntel.likelyBidders.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">{b.name}</span>
                  <ThreatBadge level={b.threat} />
                </div>
              ))}
              {analysis.competitorIntel.likelyBidders.length === 0 && (
                <span className="text-xs text-gray-600">No specific competitors detected</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-mono text-gray-500">VORENTOE ADVANTAGES</span>
            <div className="mt-1 space-y-0.5">
              {analysis.competitorIntel.vorentoeAdvantages.map((a, i) => (
                <div key={i} className="text-xs text-green-400 flex items-start gap-1"><span className="shrink-0">+</span>{a}</div>
              ))}
            </div>
          </div>
        </div>
        {analysis.competitorIntel.weaknesses.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <span className="text-[10px] font-mono text-gray-500">COMPETITOR WEAKNESSES</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {analysis.competitorIntel.weaknesses.map((w, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">{w}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Risk Assessment */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Risk Assessment</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">Score: {analysis.riskAssessment.totalRiskScore}</span>
            <RiskBadge level={analysis.riskAssessment.riskLevel} />
          </div>
        </div>
        <p className="text-xs text-gray-300 mb-3">{analysis.riskAssessment.recommendation}</p>
        <div className="space-y-1">
          {analysis.riskAssessment.riskFactors.map((f, i) => (
            <div key={i} className={`text-xs flex items-start gap-1.5 ${f.includes("advantage") ? "text-green-400" : "text-amber-400"}`}>
              <span className="shrink-0">{f.includes("advantage") ? "-" : "!"}</span>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
        <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">Action Items</h4>
        <div className="space-y-3">
          <div>
            <span className="text-[10px] font-mono text-purple-400 font-bold">BERTHA (Sales):</span>
            <p className="text-xs text-gray-300 mt-0.5">{analysis.actionItems.bertha}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono text-blue-400 font-bold">FORGE (Delivery):</span>
            <p className="text-xs text-gray-300 mt-0.5">{analysis.actionItems.forge}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">PROPOSAL STRATEGY:</span>
            <p className="text-xs text-gray-300 mt-0.5">{analysis.actionItems.proposalStrategy}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

function ScanningOverlay() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
        <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-b-cyan-400/40 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-300">Scanning sources...</p>
        <p className="text-xs text-gray-500 font-mono mt-1">Querying SAM.gov, eMaryland, eVA, DC OCP, NASPO</p>
      </div>
      <div className="flex gap-1 mt-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function OpportunityEnginePage() {
  const { queue, loading, scanning, error, lastScanResult, refresh, triggerScan, dismissScanResult } = useOpportunityEngine();
  const [activeTab, setActiveTab] = useState<ViewTab>("capture");
  const [pageMode, setPageMode] = useState<PageMode>("pipeline");

  // Auto-switch to "all" tab after a successful scan so the user sees all found opportunities
  useEffect(() => {
    if (lastScanResult && lastScanResult.totalInserted > 0) {
      setActiveTab("all");
    }
  }, [lastScanResult]);

  const getTabOpps = (): QualifiedOpportunity[] => {
    switch (activeTab) {
      case "capture": return queue.captureNowDirect;
      case "team_skyward": return queue.captureNowTeamSkyward;
      case "team_vorentoe": return queue.captureNowTeamVorentoe;
      case "watch": return queue.watch;
      case "all": return [...queue.captureNowDirect, ...queue.captureNowTeamSkyward, ...queue.captureNowTeamVorentoe, ...queue.watch, ...queue.pass];
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
              Qualification, routing & competitive intelligence for Vorentoe + Skyward
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/deals"
              className="px-3 py-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors mr-2"
            >
              Deals Pipeline
            </a>
            {/* Mode Toggle */}
            <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setPageMode("pipeline")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  pageMode === "pipeline" ? "bg-gray-800 text-gray-200" : "text-gray-500 hover:text-gray-300"
                }`}
              >Pipeline</button>
              <button
                onClick={() => setPageMode("analyze")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  pageMode === "analyze" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"
                }`}
              >Analyze RFQ</button>
            </div>
            {pageMode === "pipeline" && (
              <>
                <button onClick={triggerScan} disabled={scanning} className={`px-3 py-1.5 text-sm bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50 font-mono flex items-center gap-2 ${scanning ? "animate-pulse" : ""}`}>
                  {scanning && (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                  )}
                  {scanning ? "Scanning..." : "Scan Sources"}
                </button>
                <button onClick={refresh} disabled={loading} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50">
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">{error.message}</div>
        )}

        {lastScanResult && (
          <div className="mb-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-cyan-400">&#10003;</span>
              <span>
                Scan complete{lastScanResult.totalInserted > 0 ? ` — ${lastScanResult.totalInserted} new opportunities found` : " — no new opportunities found"}.
              </span>
              {lastScanResult.actionBreakdown && lastScanResult.totalInserted > 0 && (
                <span className="text-[10px] font-mono text-cyan-400/70">
                  ({lastScanResult.actionBreakdown.capture} capture, {lastScanResult.actionBreakdown.teamSkyward + lastScanResult.actionBreakdown.teamVorentoe} team, {lastScanResult.actionBreakdown.watch} watch, {lastScanResult.actionBreakdown.pass} pass)
                </span>
              )}
              {lastScanResult.message && <span className="text-cyan-400/60 text-xs font-mono">{lastScanResult.message}</span>}
            </div>
            <button onClick={dismissScanResult} className="text-cyan-400/60 hover:text-cyan-400 transition-colors text-xs ml-4 shrink-0">Dismiss</button>
          </div>
        )}

        {/* Analyze Mode */}
        {pageMode === "analyze" && <AnalyzePanel />}

        {/* Pipeline Mode */}
        {pageMode === "pipeline" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              <StatsCard label="Capture Now (Direct)" value={queue.captureNowDirect.length} color="text-green-400" />
              <StatsCard label="Team Skyward (Prime)" value={queue.captureNowTeamSkyward.length} color="text-cyan-400" />
              <StatsCard label="Team Vorentoe (Prime)" value={queue.captureNowTeamVorentoe.length} color="text-purple-400" />
              <StatsCard label="Watch" value={queue.watch.length} color="text-amber-400" />
              <StatsCard label="Total Scanned" value={queue.totalScanned} color="text-gray-400" />
            </div>

            {/* Routing Rules */}
            <div className="mb-6 p-3 bg-gray-900/40 border border-gray-800 rounded-lg">
              <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                <span className="text-gray-400 font-bold">ROUTING:</span>
                <span><span className="text-green-400">CAPTURE</span> = Fit 8+ / Win 55%+ / 45d+</span>
                <span><span className="text-cyan-400">TEAM SKYWARD</span> = Skyward prime, 8(a)/large fed</span>
                <span><span className="text-purple-400">TEAM VORENTOE</span> = Vorentoe prime, EDWOSB/WOSB/&lt;$1M</span>
                <span><span className="text-amber-400">WATCH</span> = Below threshold, monitor</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5 mb-6 w-fit">
              {([
                { key: "capture" as ViewTab, label: "Capture Now", count: queue.captureNowDirect.length },
                { key: "team_skyward" as ViewTab, label: "Team Skyward", count: queue.captureNowTeamSkyward.length },
                { key: "team_vorentoe" as ViewTab, label: "Team Vorentoe", count: queue.captureNowTeamVorentoe.length },
                { key: "watch" as ViewTab, label: "Watch", count: queue.watch.length },
                { key: "all" as ViewTab, label: "All", count: queue.totalScanned },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === tab.key
                      ? "bg-gray-800 text-gray-200 border border-gray-700"
                      : "text-gray-500 hover:text-gray-300 border border-transparent"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-[10px] font-mono opacity-60">{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Opportunity List */}
            {loading && !scanning ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-gray-600 border-t-cyan-400 animate-spin" />
                <p className="text-sm text-gray-500">Loading opportunity pipeline...</p>
              </div>
            ) : scanning ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ScanningOverlay />
              </div>
            ) : tabOpps.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-sm font-medium text-gray-400 mb-1">No opportunities in this category</p>
                <p className="text-xs text-gray-600 font-mono mb-4">
                  {activeTab === "all"
                    ? "Click \"Scan Sources\" to pull opportunities from SAM.gov, MoCo, EMMA, and other sources."
                    : `No ${activeTab === "capture" ? "Capture Now" : activeTab === "team_skyward" ? "Team Skyward" : activeTab === "team_vorentoe" ? "Team Vorentoe" : "Watch"} opportunities found. Try the "All" tab to see all scanned results.`}
                </p>
                {activeTab !== "all" && (
                  <button
                    onClick={() => setActiveTab("all")}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors font-mono"
                  >
                    View All Opportunities
                  </button>
                )}
                {activeTab === "all" && (
                  <button
                    onClick={triggerScan}
                    disabled={scanning}
                    className="px-4 py-2 text-sm bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors font-mono"
                  >
                    Scan Sources
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {tabOpps.map((opp) => <OpportunityDetailCard key={opp.id} opp={opp} />)}
              </div>
            )}

            <div className="mt-6 text-[10px] font-mono text-gray-600 text-center">
              Last scan: {new Date(queue.lastScanAt).toLocaleString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
