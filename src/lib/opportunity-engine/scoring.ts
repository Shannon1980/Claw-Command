import type {
  FitBreakdown,
  WinBreakdown,
  ActionRouting,
  OpportunityChannel,
} from "./types";

// ─── Vorentoe NAICS Codes (IT/AI/Gov Services) ─────────────────────────────

export const VORENTOE_NAICS = [
  "541511", // Custom Computer Programming Services
  "541512", // Computer Systems Design Services
  "541513", // Computer Facilities Management Services
  "541519", // Other Computer Related Services
  "541611", // Administrative Management Consulting
  "541612", // Human Resources Consulting
  "541613", // Marketing Consulting
  "541614", // Process/Logistics Consulting
  "541618", // Other Management Consulting
  "541690", // Other Scientific and Technical Consulting
  "541715", // R&D in the Physical, Engineering, and Life Sciences
  "518210", // Data Processing/Hosting
  "611430", // Professional/Management Development Training
];

// ─── Montgomery County Focus ────────────────────────────────────────────────

const MONTGOMERY_COUNTY_KEYWORDS = [
  "montgomery county",
  "rockville",
  "bethesda",
  "silver spring",
  "gaithersburg",
  "germantown",
  "wheaton",
  "takoma park",
];

const FEDERAL_KEYWORDS = [
  "federal",
  "dhs",
  "dod",
  "va ",
  "navy",
  "army",
  "air force",
  "cms",
  "hhs",
  "gsa",
  "disa",
  "sba",
  "nih",
  "fda",
  "usda",
  "doi",
  "epa",
  "fema",
  "ssa",
  "opm",
];

// ─── Fit Score Calculation (0-10) ───────────────────────────────────────────

export function calculateFitScore(
  naicsCodes: string[],
  setAsideType: string,
  description: string,
  isFederal: boolean
): { score: number; breakdown: FitBreakdown } {
  // NAICS Match (40%)
  const naicsOverlap = naicsCodes.filter((code) =>
    VORENTOE_NAICS.some(
      (v) => code.startsWith(v.slice(0, 4)) || v.startsWith(code.slice(0, 4))
    )
  );
  const naicsMatch = naicsCodes.length > 0
    ? Math.min(10, (naicsOverlap.length / naicsCodes.length) * 10)
    : 5; // unknown = neutral

  // Size Eligibility (30%)
  const smallBizTypes = [
    "small business",
    "8(a)",
    "wosb",
    "edwosb",
    "hubzone",
    "sdvosb",
    "sdb",
    "total small",
  ];
  const setAsideLower = setAsideType.toLowerCase();
  const sizeEligibility = smallBizTypes.some((t) => setAsideLower.includes(t))
    ? 10
    : setAsideLower === "unrestricted" || setAsideLower === ""
      ? 5
      : 2;

  // Capability Match (30%)
  const descLower = description.toLowerCase();
  const capKeywords = [
    "it ",
    "information technology",
    "software",
    "cloud",
    "ai ",
    "artificial intelligence",
    "data",
    "cybersecurity",
    "digital",
    "modernization",
    "migration",
    "consulting",
    "management",
    "training",
    "support services",
  ];
  const capMatches = capKeywords.filter((k) => descLower.includes(k)).length;
  const capabilityMatch = Math.min(10, (capMatches / 4) * 10);

  const breakdown: FitBreakdown = {
    naicsMatch: Math.round(naicsMatch * 10) / 10,
    sizeEligibility,
    capabilityMatch: Math.round(capabilityMatch * 10) / 10,
  };

  const score =
    breakdown.naicsMatch * 0.4 +
    breakdown.sizeEligibility * 0.3 +
    breakdown.capabilityMatch * 0.3;

  return { score: Math.round(score * 10) / 10, breakdown };
}

// ─── Win Probability (0-100) ────────────────────────────────────────────────

export function calculateWinProbability(
  fitScore: number,
  isFederal: boolean,
  isMongoCounty: boolean,
  competitorCount: number
): { probability: number; breakdown: WinBreakdown } {
  // Historical win rate (40%) - higher for local, lower for federal
  const historicalWinRate = isMongoCounty ? 55 : isFederal ? 25 : 35;

  // Competitive intensity discount (30%)
  // Fewer competitors = higher score
  const competitiveIntensity =
    competitorCount <= 3
      ? 80
      : competitorCount <= 10
        ? 60
        : competitorCount <= 25
          ? 40
          : 20;

  // Segment familiarity (30%)
  const segmentFamiliarity = isMongoCounty ? 85 : isFederal ? 40 : 50;

  const breakdown: WinBreakdown = {
    historicalWinRate,
    competitiveIntensity,
    segmentFamiliarity,
  };

  const probability = Math.round(
    historicalWinRate * 0.4 +
      competitiveIntensity * 0.3 +
      segmentFamiliarity * 0.3
  );

  return { probability, breakdown };
}

// ─── Action Routing ─────────────────────────────────────────────────────────

export function routeAction(
  fitScore: number,
  winProbability: number,
  daysUntilClose: number,
  isFederal: boolean,
  setAsideType?: string,
  amount?: number
): { action: ActionRouting; channel: OpportunityChannel } {
  const setAsideLower = (setAsideType || "").toLowerCase();

  // Direct qualification: Fit 8+, Win 55%+, 45+ days
  if (fitScore >= 8 && winProbability >= 55 && daysUntilClose >= 45) {
    return { action: "CAPTURE_NOW", channel: "direct" };
  }

  // Teaming qualification: Fit 6+, Win 40%+, 45+ days (federal)
  if (
    fitScore >= 6 &&
    winProbability >= 40 &&
    daysUntilClose >= 45 &&
    isFederal
  ) {
    // Team Vorentoe (Vorentoe prime, Skyward partner):
    //   EDWOSB/WOSB set-asides where Vorentoe's certification is the vehicle,
    //   or smaller contracts (<$1M) where Vorentoe's specialization leads
    const isVorentoePrimeSetAside =
      setAsideLower.includes("edwosb") || setAsideLower.includes("wosb");
    const isSmallerContract = (amount || 0) > 0 && (amount || 0) < 1_000_000;

    if (isVorentoePrimeSetAside || (!setAsideLower.includes("8(a)") && isSmallerContract)) {
      return { action: "CAPTURE_NOW_TEAM_VORENTOE", channel: "teaming_vorentoe_prime" };
    }

    // Team Skyward (Skyward prime, Vorentoe partner):
    //   8(a) set-asides, large federal contracts, or contracts needing
    //   Skyward's GSA schedules / OASIS+ / CMMI certs as the vehicle
    return { action: "CAPTURE_NOW_TEAM_SKYWARD", channel: "teaming_skyward_prime" };
  }

  // Watch: has some potential
  if (fitScore >= 4 && winProbability >= 25 && daysUntilClose >= 30) {
    return { action: "WATCH", channel: isFederal ? "teaming_skyward_prime" : "direct" };
  }

  return { action: "PASS", channel: "direct" };
}

// ─── Detect Market Segment ──────────────────────────────────────────────────

export function detectSegment(
  agency: string,
  description: string
): { isFederal: boolean; isMongoCounty: boolean } {
  const text = `${agency} ${description}`.toLowerCase();
  const isFederal = FEDERAL_KEYWORDS.some((k) => text.includes(k));
  const isMongoCounty = MONTGOMERY_COUNTY_KEYWORDS.some((k) =>
    text.includes(k)
  );
  return { isFederal, isMongoCounty };
}
