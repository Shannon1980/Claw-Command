export type {
  QualifiedOpportunity,
  ScanResult,
  DashboardQueue,
  ActionRouting,
  OpportunityChannel,
  OpportunitySource,
  FitBreakdown,
  WinBreakdown,
  SkywardPartnerProfile,
} from "./types";

export {
  calculateFitScore,
  calculateWinProbability,
  routeAction,
  detectSegment,
  VORENTOE_NAICS,
} from "./scoring";

export { computeDedupeHash } from "./dedup";
export { isRelevantOpportunity, COMBINED_NAICS, CAPABILITY_KEYWORDS } from "./relevance-filter";
export type { RelevanceResult } from "./relevance-filter";
export { scanSamGov, scanAllSources } from "./scanner";
export { scanMontgomeryCounty } from "./scanner-moco";
export { scanEmma } from "./scanner-emma";
export { SKYWARD_PROFILE } from "./skyward-profile";

// Phase 2: Intelligence Engine
export { classifyBuyerType } from "./buyer-classifier";
export type { BuyerType, BuyerProfile } from "./buyer-classifier";

export { detectCompetitors, COMPETITOR_PROFILES } from "./competitors";
export type { CompetitorProfile, CompetitorIntel, ThreatLevel } from "./competitors";

export { scoreVorentoeAdvantages, rankWinThemes } from "./win-themes";
export type { WinThemeSuggestion, VorentoeAdvantageScores } from "./win-themes";

export { assessRisk } from "./risk-assessment";
export type { RiskAssessment, RiskLevel } from "./risk-assessment";

export { analyzeOpportunity } from "./analyze";
export type { OpportunityInput, OpportunityAnalysis } from "./analyze";
