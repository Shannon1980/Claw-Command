// ─── Risk Assessment Engine ────────────────────────────────────────────────
// Based on Depa's Risk Scoring Matrix

import type { CompetitorIntel } from "./competitors";

export type RiskLevel = "LOW" | "LOW-MODERATE" | "MODERATE" | "HIGH" | "VERY_HIGH";

export interface RiskAssessment {
  totalRiskScore: number;
  riskLevel: RiskLevel;
  recommendation: string;
  riskFactors: string[];
}

interface RiskFactor {
  label: string;
  value: number;
  condition: boolean;
}

export function assessRisk(
  competitorIntel: CompetitorIntel,
  estimatedBudget: number,
  estimatedCompetitorCount: number,
  setAside: string,
  timeline: "urgent" | "normal" | "long",
  sector: "federal" | "state" | "local",
  hasPastPerformance: boolean
): RiskAssessment {
  const setAsideLower = setAside.toLowerCase();
  const primaryName = competitorIntel.primaryThreat?.name || "";
  const primaryArchetype = competitorIntel.primaryThreat?.archetype;
  const archetypes = new Set(competitorIntel.likelyBidders.map((b) => b.archetype));

  // Define risk factors per Depa's matrix
  const factors: RiskFactor[] = [
    {
      label: `${primaryName || "Incumbent"} has past performance (risk: 20)`,
      value: 20,
      condition: !hasPastPerformance && competitorIntel.likelyBidders.length > 0,
    },
    {
      label: `Big 4 competitor likely bidding (risk: 15)`,
      value: 15,
      condition: archetypes.has("big-4-consulting"),
    },
    {
      label: `Primary competitor is ${primaryName} — entrenched (risk: 10)`,
      value: 10,
      condition: primaryArchetype === "legacy-specialist" && primaryName === "MainGen",
    },
    {
      label: `Budget very low — may not be worth bidding (risk: 10)`,
      value: 10,
      condition: estimatedBudget > 0 && estimatedBudget < 100000,
    },
    {
      label: `Offshore competitor at competitive pricing (risk: 15)`,
      value: 15,
      condition: archetypes.has("offshore-body-shop"),
    },
    {
      label: `DoD buyer + Booz Allen incumbent — very hard to displace (risk: 25)`,
      value: 25,
      condition: sector === "federal" && primaryName === "Booz Allen Hamilton",
    },
    {
      label: `${estimatedCompetitorCount}+ estimated competitors — crowded field (risk: 10)`,
      value: 10,
      condition: estimatedCompetitorCount > 10,
    },
    {
      label: `5+ estimated competitors — moderate field (risk: 5)`,
      value: 5,
      condition: estimatedCompetitorCount >= 5 && estimatedCompetitorCount <= 10,
    },
    {
      label: `Unfamiliar agency type (risk: 5)`,
      value: 5,
      condition: sector === "federal" && !hasPastPerformance,
    },
    // NEGATIVE RISK (advantages)
    {
      label: `Urgent timeline — we move fast (advantage: -5)`,
      value: -5,
      condition: timeline === "urgent",
    },
    {
      label: `EDWOSB set-aside — competitors excluded (advantage: -15)`,
      value: -15,
      condition: setAsideLower.includes("edwosb") || setAsideLower.includes("wosb"),
    },
    {
      label: `Small business set-aside — Big 4 excluded (advantage: -10)`,
      value: -10,
      condition: (setAsideLower.includes("small business") || setAsideLower.includes("8(a)")) &&
                 !setAsideLower.includes("edwosb"),
    },
    {
      label: `Local market — strong familiarity (advantage: -5)`,
      value: -5,
      condition: sector === "local",
    },
    {
      label: `We have past performance (advantage: -5)`,
      value: -5,
      condition: hasPastPerformance,
    },
  ];

  const activeFactors = factors.filter((f) => f.condition);
  const totalRiskScore = Math.max(0, activeFactors.reduce((sum, f) => sum + f.value, 0));
  const riskFactors = activeFactors.map((f) => f.label);

  let riskLevel: RiskLevel;
  let recommendation: string;

  if (totalRiskScore >= 60) {
    riskLevel = "VERY_HIGH";
    recommendation = "HIGH RISK: Consider no-bid. Competitive landscape heavily favors incumbents. Only pursue with strong differentiator or teaming arrangement.";
  } else if (totalRiskScore >= 50) {
    riskLevel = "HIGH";
    recommendation = "CAUTION: High-risk opportunity. Consider focused, differentiated approach or teaming with Skyward for federal authority.";
  } else if (totalRiskScore >= 30) {
    riskLevel = "MODERATE";
    recommendation = "MODERATE RISK: Winnable with strong execution. Focus on Vorentoe differentiators and competitive positioning.";
  } else if (totalRiskScore >= 15) {
    riskLevel = "LOW-MODERATE";
    recommendation = "LOW-MODERATE RISK: Strong win opportunity. Execute standard capture process with emphasis on win themes.";
  } else {
    riskLevel = "LOW";
    recommendation = "LOW RISK: Strong win probability with standard execution. Vorentoe advantages align well with opportunity requirements.";
  }

  // Add specific competitor guidance
  if (primaryName) {
    recommendation += ` Primary threat: ${primaryName}.`;
  }

  return { totalRiskScore, riskLevel, recommendation, riskFactors };
}
