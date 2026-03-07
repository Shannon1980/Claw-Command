// ─── Buyer Type Classifier (Decision Tree per Depa's Rules) ─────────────────

export type BuyerType =
  | "defense-security-first"
  | "healthcare-innovation-cost"
  | "legacy-modernization-budget"
  | "compliance-efficiency-driven"
  | "state-government"
  | "local-government"
  | "standard-federal";

export type PricingSensitivity = "low" | "high" | "very-high" | "medium";

export interface BuyerProfile {
  buyerType: BuyerType;
  riskProfile: string;
  priorities: string[];
  messagingTone: string;
  budgetSensitivity: PricingSensitivity;
  smallBusinessWeighting: "high" | "medium" | "low";
}

const DEFENSE_AGENCIES = ["dod", "intelligence", "nsa", "nro", "navy", "army", "air force", "disa", "darpa", "defense"];
const HEALTH_AGENCIES = ["hhs", "cms", "va", "fda", "nih", "cdc"];
const LEGACY_AGENCIES = ["usda", "epa", "commerce", "noaa", "interior", "doi"];
const COMPLIANCE_AGENCIES = ["gsa", "faa", "opm", "treasury", "irs"];

export function classifyBuyerType(
  agency: string,
  sector: "federal" | "state" | "local"
): BuyerProfile {
  const agencyLower = agency.toLowerCase();

  // Defense / Intelligence
  if (DEFENSE_AGENCIES.some((a) => agencyLower.includes(a))) {
    return {
      buyerType: "defense-security-first",
      riskProfile: "low-risk-tolerance",
      priorities: ["proven-track-record", "security-compliance", "CMMC", "US-based", "risk-mitigation"],
      messagingTone: "mission-critical, security-first, proven reliability",
      budgetSensitivity: "low",
      smallBusinessWeighting: "medium",
    };
  }

  // Healthcare
  if (HEALTH_AGENCIES.some((a) => agencyLower.includes(a))) {
    return {
      buyerType: "healthcare-innovation-cost",
      riskProfile: "moderate-risk-tolerance",
      priorities: ["innovation", "cost-efficiency", "compliance", "patient-impact", "modernization"],
      messagingTone: "modern tech, AI/ML capability, cost savings, healthcare-specific",
      budgetSensitivity: "high",
      smallBusinessWeighting: "medium",
    };
  }

  // Legacy-heavy agencies
  if (LEGACY_AGENCIES.some((a) => agencyLower.includes(a))) {
    return {
      buyerType: "legacy-modernization-budget",
      riskProfile: "moderate-risk-tolerance",
      priorities: ["COBOL-knowledge", "modernization-risk", "cost-efficiency", "timeline"],
      messagingTone: "practical, results-focused, legacy-aware, staffing-scarcity angle",
      budgetSensitivity: "high",
      smallBusinessWeighting: "medium",
    };
  }

  // Compliance-driven agencies
  if (COMPLIANCE_AGENCIES.some((a) => agencyLower.includes(a))) {
    return {
      buyerType: "compliance-efficiency-driven",
      riskProfile: "low-risk-tolerance",
      priorities: ["compliance", "cost-optimization", "modern-architecture", "FedRAMP/ATO"],
      messagingTone: "efficiency, low-risk cloud, modern infrastructure, compliance-ready",
      budgetSensitivity: "high",
      smallBusinessWeighting: "medium",
    };
  }

  // State government
  if (sector === "state") {
    return {
      buyerType: "state-government",
      riskProfile: "moderate-risk-tolerance",
      priorities: ["local-knowledge", "cost", "small-business-support", "MBE/diversity"],
      messagingTone: "EDWOSB, local presence, cost-effective, diversity commitment",
      budgetSensitivity: "very-high",
      smallBusinessWeighting: "high",
    };
  }

  // Local government
  if (sector === "local") {
    return {
      buyerType: "local-government",
      riskProfile: "conservative",
      priorities: ["LSBRP", "local-small-business", "low-cost", "relationship-driven"],
      messagingTone: "LSBRP cert, local decision-maker access, Montgomery County knowledge",
      budgetSensitivity: "very-high",
      smallBusinessWeighting: "high",
    };
  }

  // Default: standard federal
  return {
    buyerType: "standard-federal",
    riskProfile: "moderate-risk-tolerance",
    priorities: ["cost", "capability", "compliance", "delivery"],
    messagingTone: "balanced, professional, compliance-aware",
    budgetSensitivity: "medium",
    smallBusinessWeighting: "medium",
  };
}
