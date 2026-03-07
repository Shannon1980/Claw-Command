// ─── Win Theme Library & Ranking Engine ─────────────────────────────────────
// Based on Depa's Win Theme Generation Rules

import type { BuyerType, BuyerProfile } from "./buyer-classifier";
import type { CompetitorIntel } from "./competitors";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WinThemeSuggestion {
  rank: number;
  theme: string;
  scoreRelevance: number;
  headline: string;
  keyMessages: string[];
  competitiveVs: {
    competitor: string;
    ourStrength: string;
    theirWeakness: string;
  };
  estimatedWinProbability: string;
}

export interface VorentoeAdvantageScores {
  edwosbAgility: number;        // 0-10
  modernStackGovExpertise: number; // 0-10
  usBasedLowerCost: number;     // 0-10
  specializedModernization: number; // 0-10
}

// ─── Core Advantage Scoring ────────────────────────────────────────────────

export function scoreVorentoeAdvantages(
  scope: string,
  description: string,
  setAside: string,
  sector: "federal" | "state" | "local",
  estimatedBudget: number,
  competitorIntel: CompetitorIntel
): VorentoeAdvantageScores {
  const text = `${scope} ${description}`.toLowerCase();
  const setAsideLower = setAside.toLowerCase();
  const archetypes = new Set(competitorIntel.likelyBidders.map((b) => b.archetype));

  // Advantage 1: EDWOSB + Small Business Agility
  let edwosbAgility = 4; // baseline
  if (setAsideLower.includes("edwosb")) edwosbAgility = 10;
  else if (setAsideLower.includes("wosb")) edwosbAgility = 9;
  else if (setAsideLower.includes("small business") || setAsideLower.includes("8(a)")) edwosbAgility = 7;
  else if (sector === "state" || sector === "local") edwosbAgility = 7;
  if (text.includes("diversity") || text.includes("woman-owned") || text.includes("minority")) edwosbAgility = Math.min(10, edwosbAgility + 2);

  // Advantage 2: Modern Stack + Government Expertise
  let modernStackGovExpertise = 3;
  if (text.includes("cloud") || text.includes("ai ") || text.includes("artificial intelligence")) modernStackGovExpertise = 9;
  else if (text.includes("moderniz") || text.includes("migration") || text.includes("digital")) modernStackGovExpertise = 8;
  else if (text.includes("platform") || text.includes("devops")) modernStackGovExpertise = 7;
  if (archetypes.has("legacy-specialist")) modernStackGovExpertise = Math.min(10, modernStackGovExpertise + 1);

  // Advantage 3: US-Based + AI Tooling + Lower Cost
  let usBasedLowerCost = 3;
  if (archetypes.has("offshore-body-shop")) usBasedLowerCost = 9;
  else if (estimatedBudget > 0 && estimatedBudget < 300000) usBasedLowerCost = 8;
  else if (estimatedBudget > 0 && estimatedBudget < 1000000) usBasedLowerCost = 6;
  if (text.includes("us-based") || text.includes("domestic") || text.includes("onshore")) usBasedLowerCost = Math.min(10, usBasedLowerCost + 2);

  // Advantage 4: Specialized Modernization Focus
  let specializedModernization = 3;
  if (text.includes("cobol") || text.includes("mainframe") || text.includes("legacy")) specializedModernization = 10;
  else if (text.includes("moderniz") || text.includes("transformation") || text.includes("migration")) specializedModernization = 8;
  if (archetypes.has("big-4-consulting")) specializedModernization = Math.min(10, specializedModernization + 1);

  return { edwosbAgility, modernStackGovExpertise, usBasedLowerCost, specializedModernization };
}

// ─── Win Theme Library ─────────────────────────────────────────────────────

interface ThemeTemplate {
  id: string;
  category: "edwosb" | "modern-stack" | "us-based" | "specialized-modernization";
  theme: string;
  baseScore: number;
  bestFor: string[];
  headlineTemplate: string;
  keyMessages: string[];
  trackedWinRate: number; // historical
}

const THEME_LIBRARY: ThemeTemplate[] = [
  // EDWOSB + Small Business Agility
  {
    id: "edwosb-modern-vs-legacy",
    category: "edwosb",
    theme: "EDWOSB Modern Stack vs. Legacy Competitors",
    baseScore: 9,
    bestFor: ["federal with EDWOSB setaside", "buyer mentions diversity"],
    headlineTemplate: "EDWOSB-certified modern approach. Direct access to leadership. No bureaucratic layers.",
    keyMessages: [
      "EDWOSB certified — support woman-owned businesses while getting modern solutions",
      "Direct access to founder (Shannon) — responsive, no layers of bureaucracy",
      "Modern tooling + AI augmentation vs. legacy manual approaches",
      "Small business agility: faster delivery, lower overhead, better value",
    ],
    trackedWinRate: 67,
  },
  {
    id: "edwosb-innovation",
    category: "edwosb",
    theme: "Woman-Owned Small Business Innovation",
    baseScore: 8,
    bestFor: ["state government", "local government", "diversity-focused procurement"],
    headlineTemplate: "Woman-owned innovation with small business responsiveness and local community investment.",
    keyMessages: [
      "EDWOSB/WOSB certified woman-owned small business",
      "Local economic impact — Montgomery County presence",
      "Innovation-driven: modern tech, agile delivery, measurable results",
      "Direct partnership with leadership — not a faceless vendor",
    ],
    trackedWinRate: 50,
  },

  // Modern Stack + Government Expertise
  {
    id: "ai-ml-transformation",
    category: "modern-stack",
    theme: "AI/ML-Powered Legacy Transformation",
    baseScore: 8,
    bestFor: ["legacy modernization", "AI/ML scope", "HHS", "CMS"],
    headlineTemplate: "AI/ML-accelerated transformation. We speak both legacy and modern. 4 weeks vs 6 months.",
    keyMessages: [
      "AI/ML tools accelerate assessment and translation (4 weeks vs 6 months traditional)",
      "Fluent in both legacy systems and modern cloud (Python/Go/Node on AWS/Azure)",
      "Proven patterns reduce rework risk vs bespoke approaches",
      "Faster time-to-value — not an 18-month waterfall project",
    ],
    trackedWinRate: 50,
  },
  {
    id: "cloud-no-lock-in",
    category: "modern-stack",
    theme: "Cost-Efficient Government Cloud Without Vendor Lock-In",
    baseScore: 7,
    bestFor: ["cloud migration", "compliance-focused buyer", "GSA", "FAA"],
    headlineTemplate: "Modern cloud architecture with compliance built in. No vendor lock-in. FedRAMP-ready.",
    keyMessages: [
      "Cloud-native architecture designed for government compliance requirements",
      "Multi-cloud strategy prevents vendor lock-in and reduces long-term cost",
      "FedRAMP/ATO compliance expertise built into every implementation",
      "Cost savings through modern architecture vs. lift-and-shift approaches",
    ],
    trackedWinRate: 45,
  },
  {
    id: "legacy-modern-bilingual",
    category: "modern-stack",
    theme: "Legacy to Modern: We Speak Both Languages",
    baseScore: 8,
    bestFor: ["COBOL modernization", "legacy systems", "transformation projects"],
    headlineTemplate: "We speak COBOL and modern cloud. Bridge the gap without the risk of full rewrite.",
    keyMessages: [
      "Fluent in both COBOL/mainframe and modern cloud platforms",
      "Incremental modernization: reduce risk vs big-bang rewrites",
      "AI-assisted code assessment identifies technical debt and migration paths",
      "Staffing scarcity solution: modern engineers trained in legacy pattern recognition",
    ],
    trackedWinRate: 55,
  },

  // US-Based + Lower Cost
  {
    id: "us-based-alternative",
    category: "us-based",
    theme: "US-Based Alternative to Offshore Delivery",
    baseScore: 7,
    bestFor: ["cost-sensitive budget", "offshore competitor threat"],
    headlineTemplate: "Same price as offshore, zero risk. All US-based, no timezone friction, no security concerns.",
    keyMessages: [
      "US-based delivery eliminates offshore labor and security concerns",
      "Direct communication — no timezone friction, same-day responsiveness",
      "Competitive pricing without security/compliance trade-offs",
      "Political headwinds on offshore labor work in our favor",
    ],
    trackedWinRate: 40,
  },
  {
    id: "us-based-direct-comms",
    category: "us-based",
    theme: "No Timezone Friction, Direct Communication",
    baseScore: 6,
    bestFor: ["ongoing support contracts", "real-time collaboration needs"],
    headlineTemplate: "Same timezone, same language, direct access. No offshore handoff delays.",
    keyMessages: [
      "100% US-based team — real-time collaboration during business hours",
      "Direct Slack/Teams access to your delivery team, not a project manager",
      "No offshore handoff delays or miscommunication risk",
      "AI-augmented tooling keeps costs competitive with offshore pricing",
    ],
    trackedWinRate: 35,
  },

  // Specialized Modernization
  {
    id: "cobol-to-cloud",
    category: "specialized-modernization",
    theme: "COBOL-to-Cloud Modernization with EDWOSB Advantage",
    baseScore: 9,
    bestFor: ["COBOL/mainframe scope", "EDWOSB setaside", "legacy modernization"],
    headlineTemplate: "We speak COBOL and cloud. EDWOSB advantage. Agile delivery vs legacy-only competitors.",
    keyMessages: [
      "Fluent in both COBOL and modern cloud (Python/Go/Node on AWS/Azure)",
      "AI/ML tools accelerate assessment & translation (4 weeks vs 6 months)",
      "EDWOSB certified — support woman-owned businesses",
      "Direct access to founder (Shannon) — responsive, no layers of bureaucracy",
    ],
    trackedWinRate: 67,
  },
  {
    id: "legacy-talent-scarcity",
    category: "specialized-modernization",
    theme: "Legacy System Talent Scarcity Solution",
    baseScore: 7,
    bestFor: ["agencies struggling with COBOL talent", "staffing concerns"],
    headlineTemplate: "Solving the COBOL talent cliff. Modern engineers trained in legacy patterns, powered by AI.",
    keyMessages: [
      "Addressing the COBOL talent retirement crisis with modern engineering approaches",
      "AI-assisted legacy code understanding reduces dependency on retiring specialists",
      "Knowledge transfer programs capture institutional expertise before it's lost",
      "Hybrid team model: legacy specialists paired with modern engineers",
    ],
    trackedWinRate: 45,
  },
  {
    id: "boutique-vs-big4",
    category: "specialized-modernization",
    theme: "Boutique Modernization vs. Big 4 Bloat",
    baseScore: 7,
    bestFor: ["Accenture/Deloitte competitor", "innovation-focused buyers"],
    headlineTemplate: "Modernization specialists, not generalist consultants. Faster, focused, proven patterns.",
    keyMessages: [
      "Specialized modernization focus — not generalist Big 4 consulting",
      "Smaller, focused team = better engagement, faster decisions",
      "Proven patterns reduce rework risk vs bespoke Big 4 approaches",
      "Faster time-to-value: weeks not months for first working increment",
    ],
    trackedWinRate: 35,
  },
];

// ─── Theme Ranking Algorithm ───────────────────────────────────────────────

export function rankWinThemes(
  scope: string,
  description: string,
  setAside: string,
  buyerProfile: BuyerProfile,
  competitorIntel: CompetitorIntel,
  advantageScores: VorentoeAdvantageScores
): WinThemeSuggestion[] {
  const text = `${scope} ${description}`.toLowerCase();
  const setAsideLower = setAside.toLowerCase();
  const primaryThreat = competitorIntel.primaryThreat;
  const archetypes = new Set(competitorIntel.likelyBidders.map((b) => b.archetype));

  const scored: Array<{ template: ThemeTemplate; score: number }> = [];

  for (const template of THEME_LIBRARY) {
    let score = template.baseScore;

    // Category advantage boost (x2 weight per Depa's rules)
    switch (template.category) {
      case "edwosb":
        score += advantageScores.edwosbAgility * 0.2;
        break;
      case "modern-stack":
        score += advantageScores.modernStackGovExpertise * 0.2;
        break;
      case "us-based":
        score += advantageScores.usBasedLowerCost * 0.2;
        break;
      case "specialized-modernization":
        score += advantageScores.specializedModernization * 0.2;
        break;
    }

    // Buyer type relevance boost (x3 weight per Depa's rules)
    const buyerBoosts: Partial<Record<BuyerType, string[]>> = {
      "defense-security-first": ["us-based", "modern-stack"],
      "healthcare-innovation-cost": ["modern-stack", "edwosb"],
      "legacy-modernization-budget": ["specialized-modernization", "modern-stack"],
      "compliance-efficiency-driven": ["modern-stack", "us-based"],
      "state-government": ["edwosb", "us-based"],
      "local-government": ["edwosb", "us-based"],
      "standard-federal": ["edwosb", "modern-stack"],
    };
    if (buyerBoosts[buyerProfile.buyerType]?.includes(template.category)) {
      score += 1.5;
    }

    // EDWOSB set-aside boost (+2 for EDWOSB-related themes)
    if (setAsideLower.includes("edwosb") && template.category === "edwosb") {
      score += 2;
    }

    // Offshore competitor boost (+2 for US-based themes)
    if (archetypes.has("offshore-body-shop") && template.category === "us-based") {
      score += 2;
    }

    // COBOL/legacy scope boost (+2 for modernization themes)
    if ((text.includes("cobol") || text.includes("legacy") || text.includes("mainframe")) &&
        template.category === "specialized-modernization") {
      score += 2;
    }

    // Cloud/AI scope boost
    if ((text.includes("cloud") || text.includes("ai ") || text.includes("artificial intelligence")) &&
        template.category === "modern-stack") {
      score += 1.5;
    }

    // Big 4 competitor boost for boutique theme
    if (archetypes.has("big-4-consulting") && template.id === "boutique-vs-big4") {
      score += 2;
    }

    // Historical win rate bonus
    score += template.trackedWinRate * 0.01;

    if (score > 5) {
      scored.push({ template, score });
    }
  }

  // Sort descending, deduplicate by category (max 2 per category)
  scored.sort((a, b) => b.score - a.score);
  const categoryCounts: Record<string, number> = {};
  const selected: typeof scored = [];
  for (const item of scored) {
    const cat = item.template.category;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    if (categoryCounts[cat] <= 2) {
      selected.push(item);
    }
  }

  // Build top 3 suggestions
  return selected.slice(0, 3).map((item, index) => {
    const t = item.template;
    const competitor = findBestCompetitorMatch(t.category, competitorIntel);

    return {
      rank: index + 1,
      theme: t.theme,
      scoreRelevance: Math.round(item.score * 10) / 10,
      headline: t.headlineTemplate,
      keyMessages: t.keyMessages,
      competitiveVs: {
        competitor: competitor.name,
        ourStrength: competitor.ourStrength,
        theirWeakness: competitor.theirWeakness,
      },
      estimatedWinProbability: estimateThemeWinProbability(
        t, setAside, primaryThreat?.archetype || null, archetypes
      ),
    };
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function findBestCompetitorMatch(
  themeCategory: string,
  intel: CompetitorIntel
): { name: string; ourStrength: string; theirWeakness: string } {
  const primary = intel.primaryThreat;
  if (!primary) {
    return {
      name: "Generic competitors",
      ourStrength: "EDWOSB + modern approach + agility",
      theirWeakness: "Not EDWOSB, slower, higher overhead",
    };
  }

  const matchMap: Record<string, Record<string, { ourStrength: string; theirWeakness: string }>> = {
    edwosb: {
      "legacy-specialist": { ourStrength: "Modern + EDWOSB certified", theirWeakness: "Not EDWOSB, legacy approach" },
      "big-4-consulting": { ourStrength: "EDWOSB + faster + cheaper", theirWeakness: "Not small business, expensive, slow" },
      "offshore-body-shop": { ourStrength: "EDWOSB + US-based + same price", theirWeakness: "Not EDWOSB, offshore risk, timezone issues" },
      "government-specialist": { ourStrength: "EDWOSB + agile + modern stack", theirWeakness: "Not EDWOSB, bureaucratic, expensive" },
      "emerging-modernization": { ourStrength: "EDWOSB + government experience", theirWeakness: "No certs, no gov experience, no clearances" },
    },
    "modern-stack": {
      "legacy-specialist": { ourStrength: "Modern tooling + AI augmentation", theirWeakness: "Manual COBOL experts, slow innovation" },
      "big-4-consulting": { ourStrength: "Specialized modern stack + agility", theirWeakness: "Generalist approach, heavy overhead" },
      "offshore-body-shop": { ourStrength: "Modern architecture + US-based", theirWeakness: "Commodity development, no innovation" },
      "government-specialist": { ourStrength: "Modern tech + cloud-native", theirWeakness: "Legacy infrastructure focus" },
      "emerging-modernization": { ourStrength: "Modern tech + federal compliance", theirWeakness: "No gov experience or compliance" },
    },
    "us-based": {
      "legacy-specialist": { ourStrength: "US-based + modern approach", theirWeakness: "Expensive, outdated methods" },
      "big-4-consulting": { ourStrength: "US-based + cost-efficient", theirWeakness: "Expensive, layers of management" },
      "offshore-body-shop": { ourStrength: "Domestic labor + security posture", theirWeakness: "Offshore concerns, H-1B scrutiny, timezone friction" },
      "government-specialist": { ourStrength: "Cost-efficient US-based team", theirWeakness: "Expensive cleared workforce" },
      "emerging-modernization": { ourStrength: "US-based + gov compliance", theirWeakness: "No compliance infrastructure" },
    },
    "specialized-modernization": {
      "legacy-specialist": { ourStrength: "COBOL translator + AI/ML modernization", theirWeakness: "Legacy-only, no modernization path" },
      "big-4-consulting": { ourStrength: "Specialization, agility, faster delivery", theirWeakness: "Generalist, heavy overhead, slow decision-making" },
      "offshore-body-shop": { ourStrength: "Modernization expertise + security", theirWeakness: "Commodity staffing, no specialization" },
      "government-specialist": { ourStrength: "Modern transformation focus", theirWeakness: "Maintain legacy, don't modernize" },
      "emerging-modernization": { ourStrength: "Federal compliance + modernization", theirWeakness: "No gov experience" },
    },
  };

  const catMatch = matchMap[themeCategory]?.[primary.archetype];
  return {
    name: primary.name,
    ourStrength: catMatch?.ourStrength || "EDWOSB + modern approach + agility",
    theirWeakness: catMatch?.theirWeakness || primary.weaknesses.slice(0, 2).join(", "),
  };
}

function estimateThemeWinProbability(
  theme: ThemeTemplate,
  setAside: string,
  primaryArchetype: string | null,
  archetypes: Set<string>
): string {
  let base = 40;
  const setAsideLower = setAside.toLowerCase();

  if (setAsideLower.includes("edwosb") || setAsideLower.includes("wosb")) base += 15;
  if (archetypes.has("offshore-body-shop")) base += 10; // security/timezone advantage
  if (theme.category === "specialized-modernization") base += 10;
  if (primaryArchetype === "government-specialist" || primaryArchetype === "big-4-consulting") base -= 15;
  if (primaryArchetype === "legacy-specialist") base -= 10;

  // Historical performance adjustment
  base = Math.round(base * 0.7 + theme.trackedWinRate * 0.3);

  return `${Math.max(15, Math.min(85, base))}%`;
}
