// ─── Opportunity Analysis Engine ────────────────────────────────────────────
// Full pipeline: Input → Classify → Detect → Score → Rank → Assess → Output

import { classifyBuyerType, type BuyerProfile } from "./buyer-classifier";
import { detectCompetitors, type CompetitorIntel } from "./competitors";
import { scoreVorentoeAdvantages, rankWinThemes, type WinThemeSuggestion, type VorentoeAdvantageScores } from "./win-themes";
import { assessRisk, type RiskAssessment } from "./risk-assessment";

// ─── Input Schema (What Bertha provides) ───────────────────────────────────

export interface OpportunityInput {
  opportunityId: string;
  title: string;
  agency: string;
  sector: "federal" | "state" | "local";
  naics?: string;
  scope: string;
  description: string;
  estimatedBudget: number;
  priceRange?: "low" | "mid" | "high";
  timeline?: "urgent" | "normal" | "long";
  setAsides: string;
  geographyPreference?: string;
  pastPerformance?: boolean;
  securityRequirement?: "low" | "medium" | "high" | "CMMC" | "FedRAMP";
  competitorIntel?: {
    likelyBidders?: string[];
    estimatedCompetitorCount?: number;
  };
}

// ─── Output Schema (What Bertha gets) ──────────────────────────────────────

export interface OpportunityAnalysis {
  opportunityId: string;
  analysisDate: string;
  title: string;
  agency: string;
  scope: string;

  buyerProfile: BuyerProfile;

  competitorIntel: {
    likelyBidders: Array<{ name: string; archetype: string; threat: string }>;
    primaryThreat: string | null;
    competitorArchetype: string | null;
    weaknesses: string[];
    vorentoeAdvantages: string[];
  };

  vorentoeAdvantageScores: VorentoeAdvantageScores;

  suggestedWinThemes: WinThemeSuggestion[];

  riskAssessment: RiskAssessment;

  actionItems: {
    bertha: string;
    forge: string;
    proposalStrategy: string;
  };
}

// ─── Main Analysis Function ────────────────────────────────────────────────

export function analyzeOpportunity(input: OpportunityInput): OpportunityAnalysis {
  const now = new Date().toISOString().split("T")[0];

  // Step 1: Classify buyer type
  const buyerProfile = classifyBuyerType(input.agency, input.sector);

  // Step 2: Detect competitors
  const competitorIntel = detectCompetitors(
    input.scope,
    input.description,
    input.estimatedBudget,
    input.sector,
    input.setAsides
  );

  // Step 3: Score Vorentoe advantages
  const advantageScores = scoreVorentoeAdvantages(
    input.scope,
    input.description,
    input.setAsides,
    input.sector,
    input.estimatedBudget,
    competitorIntel
  );

  // Step 4: Rank win themes
  const suggestedWinThemes = rankWinThemes(
    input.scope,
    input.description,
    input.setAsides,
    buyerProfile,
    competitorIntel,
    advantageScores
  );

  // Step 5: Assess risk
  const timeline = input.timeline || inferTimeline(input);
  const estimatedCompetitorCount =
    input.competitorIntel?.estimatedCompetitorCount ||
    competitorIntel.likelyBidders.length;
  const riskAssessment = assessRisk(
    competitorIntel,
    input.estimatedBudget,
    estimatedCompetitorCount,
    input.setAsides,
    timeline,
    input.sector,
    input.pastPerformance ?? false
  );

  // Step 6: Generate action items
  const actionItems = generateActionItems(
    suggestedWinThemes,
    competitorIntel,
    buyerProfile,
    input
  );

  return {
    opportunityId: input.opportunityId,
    analysisDate: now,
    title: input.title,
    agency: input.agency,
    scope: input.scope,
    buyerProfile,
    competitorIntel: {
      likelyBidders: competitorIntel.likelyBidders.map((b) => ({
        name: b.name,
        archetype: b.archetype,
        threat: b.threat,
      })),
      primaryThreat: competitorIntel.primaryThreat?.name || null,
      competitorArchetype: competitorIntel.competitorArchetype || null,
      weaknesses: competitorIntel.weaknesses,
      vorentoeAdvantages: competitorIntel.vorentoeAdvantages,
    },
    vorentoeAdvantageScores: advantageScores,
    suggestedWinThemes,
    riskAssessment,
    actionItems,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function inferTimeline(input: OpportunityInput): "urgent" | "normal" | "long" {
  if (input.priceRange === "low") return "normal";
  if (input.estimatedBudget > 5000000) return "long";
  return "normal";
}

function generateActionItems(
  themes: WinThemeSuggestion[],
  competitorIntel: CompetitorIntel,
  buyerProfile: BuyerProfile,
  input: OpportunityInput
): { bertha: string; forge: string; proposalStrategy: string } {
  const topTheme = themes[0];
  const primaryThreat = competitorIntel.primaryThreat?.name || "competitors";
  const scope = input.scope.toLowerCase();

  // Bertha action items
  let bertha = `Use Theme #1 (${topTheme?.theme || "TBD"}) as primary positioning.`;
  if (buyerProfile.budgetSensitivity === "very-high" || buyerProfile.budgetSensitivity === "high") {
    bertha += " Emphasize cost-efficiency in initial conversations.";
  }
  if (input.setAsides.toLowerCase().includes("edwosb")) {
    bertha += " Lead with EDWOSB certification in proposal cover letter.";
  }
  bertha += ` Request customer's view on ${primaryThreat}'s current performance (will affect competitive positioning).`;

  // Forge action items
  let forge = "";
  if (scope.includes("cobol") || scope.includes("legacy") || scope.includes("moderniz")) {
    forge = "Prepare 2-3 COBOL-to-cloud or modernization case studies. Outline AI/ML-assisted assessment approach to prove speed advantage.";
  } else if (scope.includes("cloud") || scope.includes("migration")) {
    forge = "Prepare cloud migration architecture examples. Document FedRAMP/compliance readiness approach.";
  } else if (scope.includes("ai") || scope.includes("artificial intelligence")) {
    forge = "Prepare AI/ML capability deck with government use cases. Outline responsible AI framework for federal compliance.";
  } else if (scope.includes("data") || scope.includes("analytics")) {
    forge = "Prepare data analytics platform examples. Document data governance and security approach.";
  } else {
    forge = "Validate win themes are deliverable with current team. Identify resource constraints. Suggest delivery approach that proves the win theme.";
  }

  // Proposal strategy
  let proposalStrategy = "";
  if (topTheme) {
    proposalStrategy = `Lead with ${topTheme.theme}. `;
  }
  if (competitorIntel.primaryThreat) {
    const pt = competitorIntel.primaryThreat;
    proposalStrategy += `Position against ${pt.name}'s ${pt.weaknesses[0] || "limitations"}. `;
  }
  proposalStrategy += `Support with ${buyerProfile.priorities.slice(0, 2).join(" + ")} messaging.`;

  return { bertha, forge, proposalStrategy };
}
