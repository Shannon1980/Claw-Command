// ─── Competitor Threat Profiles ─────────────────────────────────────────────

export type ThreatLevel = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
export type CompetitorArchetype =
  | "legacy-specialist"
  | "big-4-consulting"
  | "offshore-body-shop"
  | "government-specialist"
  | "emerging-modernization"
  | "cloud-native";

export interface CompetitorProfile {
  name: string;
  archetype: CompetitorArchetype;
  threat: ThreatLevel;
  strengths: string[];
  weaknesses: string[];
  triggerKeywords: string[]; // keywords in RFQ scope that indicate this competitor will bid
  budgetRange: { min: number; max: number } | null; // typical contract sizes they pursue
  naicsFocus: string[]; // NAICS codes they compete in
}

export const COMPETITOR_PROFILES: CompetitorProfile[] = [
  // LEGACY SPECIALISTS
  {
    name: "MainGen",
    archetype: "legacy-specialist",
    threat: "HIGH",
    strengths: ["Strong COBOL expertise", "DoD/VA relationships", "Past performance depth"],
    weaknesses: ["Slow tech adoption", "Expensive staffing", "Not EDWOSB"],
    triggerKeywords: ["cobol", "mainframe", "legacy", "migration", "modernization"],
    budgetRange: { min: 500000, max: 10000000 },
    naicsFocus: ["541511", "541512"],
  },
  {
    name: "DXC/Unisys",
    archetype: "legacy-specialist",
    threat: "MEDIUM",
    strengths: ["Enterprise scale", "Government contracts"],
    weaknesses: ["Declining perception", "Outdated approach", "High overhead"],
    triggerKeywords: ["mainframe", "legacy", "infrastructure"],
    budgetRange: { min: 1000000, max: 50000000 },
    naicsFocus: ["541512", "541513"],
  },

  // BIG 4 CONSULTING
  {
    name: "Accenture",
    archetype: "big-4-consulting",
    threat: "VERY_HIGH",
    strengths: ["Scale", "Brand recognition", "Deep relationships", "Massive resources"],
    weaknesses: ["Expensive", "Slow to mobilize", "Generalist approach", "Not small business"],
    triggerKeywords: ["strategic", "transformation", "enterprise", "digital"],
    budgetRange: { min: 2000000, max: 100000000 },
    naicsFocus: ["541511", "541512", "541611"],
  },
  {
    name: "Deloitte",
    archetype: "big-4-consulting",
    threat: "VERY_HIGH",
    strengths: ["Scale", "Federal relationships", "Consulting depth"],
    weaknesses: ["Expensive", "Bureaucratic", "Not small business"],
    triggerKeywords: ["consulting", "strategic", "advisory", "audit"],
    budgetRange: { min: 2000000, max: 100000000 },
    naicsFocus: ["541611", "541612", "541618"],
  },
  {
    name: "McKinsey",
    archetype: "big-4-consulting",
    threat: "HIGH",
    strengths: ["Strategy-first positioning", "Premium brand", "Executive access"],
    weaknesses: ["Very expensive", "Limited implementation", "Not small business"],
    triggerKeywords: ["strategy", "advisory", "optimization", "consulting"],
    budgetRange: { min: 5000000, max: 50000000 },
    naicsFocus: ["541611", "541618"],
  },

  // OFFSHORE BODY SHOPS
  {
    name: "TCS",
    archetype: "offshore-body-shop",
    threat: "HIGH",
    strengths: ["Aggressive pricing", "Large bench", "Global delivery"],
    weaknesses: ["Offshore risk", "Timezone issues", "Security concerns", "Political headwinds"],
    triggerKeywords: ["support", "development", "maintenance", "staff augmentation"],
    budgetRange: { min: 200000, max: 20000000 },
    naicsFocus: ["541511", "541512", "541519"],
  },
  {
    name: "Cognizant",
    archetype: "offshore-body-shop",
    threat: "HIGH",
    strengths: ["Aggressive pricing", "Healthcare expertise", "Scale"],
    weaknesses: ["Offshore risk", "Quality concerns", "Security gaps"],
    triggerKeywords: ["healthcare", "support", "development", "modernization"],
    budgetRange: { min: 200000, max: 20000000 },
    naicsFocus: ["541511", "541512"],
  },
  {
    name: "Infosys",
    archetype: "offshore-body-shop",
    threat: "MEDIUM",
    strengths: ["Scale", "AI capabilities", "Pricing"],
    weaknesses: ["Less active in fed market", "Offshore risk", "Limited past performance"],
    triggerKeywords: ["digital", "cloud", "development"],
    budgetRange: { min: 500000, max: 15000000 },
    naicsFocus: ["541511", "541512"],
  },

  // GOVERNMENT SPECIALISTS
  {
    name: "Booz Allen Hamilton",
    archetype: "government-specialist",
    threat: "VERY_HIGH",
    strengths: ["DoD specialist", "Deep clearances", "Entrenched relationships", "Past performance"],
    weaknesses: ["Expensive", "Slow innovation", "Not small business"],
    triggerKeywords: ["defense", "intelligence", "dod", "navy", "army", "air force", "classified"],
    budgetRange: { min: 5000000, max: 500000000 },
    naicsFocus: ["541511", "541512", "541690", "541715"],
  },
  {
    name: "SAIC/Leidos",
    archetype: "government-specialist",
    threat: "HIGH",
    strengths: ["Defense contractor", "Entrenched", "Cleared workforce"],
    weaknesses: ["Bureaucratic", "Expensive", "Legacy approach"],
    triggerKeywords: ["defense", "intelligence", "systems engineering", "command and control"],
    budgetRange: { min: 5000000, max: 200000000 },
    naicsFocus: ["541511", "541512", "541715"],
  },

  // EMERGING MODERNIZATION
  {
    name: "Thoughtworks",
    archetype: "emerging-modernization",
    threat: "MEDIUM",
    strengths: ["Modern tech culture", "Agile expertise", "Strong engineering"],
    weaknesses: ["No gov experience", "No GSA contract", "No clearances"],
    triggerKeywords: ["agile", "devops", "modern", "cloud native"],
    budgetRange: { min: 500000, max: 10000000 },
    naicsFocus: ["541511", "541512"],
  },
];

// ─── Competitor Detection ──────────────────────────────────────────────────

export interface CompetitorIntel {
  likelyBidders: CompetitorProfile[];
  primaryThreat: CompetitorProfile | null;
  competitorArchetype: CompetitorArchetype | null;
  weaknesses: string[];
  vorentoeAdvantages: string[];
}

export function detectCompetitors(
  scope: string,
  description: string,
  estimatedBudget: number,
  sector: "federal" | "state" | "local",
  setAside: string
): CompetitorIntel {
  const text = `${scope} ${description}`.toLowerCase();
  const setAsideLower = setAside.toLowerCase();

  // Small business set-asides exclude big players
  const isSmallBizSetAside =
    setAsideLower.includes("small business") ||
    setAsideLower.includes("8(a)") ||
    setAsideLower.includes("edwosb") ||
    setAsideLower.includes("wosb") ||
    setAsideLower.includes("hubzone") ||
    setAsideLower.includes("sdvosb");

  const scored: Array<{ profile: CompetitorProfile; score: number }> = [];

  for (const profile of COMPETITOR_PROFILES) {
    let score = 0;

    // Keyword match
    const keywordMatches = profile.triggerKeywords.filter((k) => text.includes(k)).length;
    score += keywordMatches * 10;

    // Budget range match
    if (profile.budgetRange && estimatedBudget > 0) {
      if (estimatedBudget >= profile.budgetRange.min && estimatedBudget <= profile.budgetRange.max) {
        score += 15;
      }
    }

    // Sector relevance
    if (sector === "federal" && ["government-specialist", "big-4-consulting"].includes(profile.archetype)) {
      score += 10;
    }
    if (sector === "local" && profile.archetype === "offshore-body-shop") {
      score -= 10; // less likely in local gov
    }

    // Exclude large firms from small business set-asides
    if (isSmallBizSetAside) {
      if (["big-4-consulting", "government-specialist"].includes(profile.archetype)) {
        score -= 50; // effectively excluded
      }
    }

    if (score > 0) {
      scored.push({ profile, score });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  const likelyBidders = scored.slice(0, 5).map((s) => s.profile);
  const primaryThreat = likelyBidders[0] || null;

  // Aggregate weaknesses from likely bidders
  const weaknesses = [...new Set(likelyBidders.flatMap((b) => b.weaknesses))].slice(0, 6);

  // Vorentoe advantages based on competitor landscape
  const vorentoeAdvantages: string[] = [];
  const archetypes = new Set(likelyBidders.map((b) => b.archetype));

  if (isSmallBizSetAside) vorentoeAdvantages.push("EDWOSB certification advantage");
  if (archetypes.has("legacy-specialist")) vorentoeAdvantages.push("Modern stack vs legacy approach");
  if (archetypes.has("offshore-body-shop")) vorentoeAdvantages.push("US-based delivery, zero offshore risk");
  if (archetypes.has("big-4-consulting")) vorentoeAdvantages.push("Boutique agility vs Big 4 bloat");
  if (text.includes("moderniz") || text.includes("cloud") || text.includes("migration")) {
    vorentoeAdvantages.push("Specialized modernization focus");
  }
  if (text.includes("ai") || text.includes("artificial intelligence") || text.includes("machine learning")) {
    vorentoeAdvantages.push("AI/ML implementation capability");
  }
  vorentoeAdvantages.push("Agile delivery model");

  return {
    likelyBidders,
    primaryThreat,
    competitorArchetype: primaryThreat?.archetype || null,
    weaknesses,
    vorentoeAdvantages: vorentoeAdvantages.slice(0, 5),
  };
}
