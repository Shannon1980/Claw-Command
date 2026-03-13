import { SKYWARD_PROFILE } from "./skyward-profile";

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

// ─── Combined NAICS Codes (Vorentoe + Skyward) ─────────────────────────────

export const COMBINED_NAICS = [
  ...new Set([...VORENTOE_NAICS, ...SKYWARD_PROFILE.naicsCodes]),
];

// ─── Capability Keywords ────────────────────────────────────────────────────
// Shared between relevance filtering and fit score calculation.

export const CAPABILITY_KEYWORDS = [
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

// ─── Relevance Result ───────────────────────────────────────────────────────

export interface RelevanceResult {
  relevant: boolean;
  naicsMatched: boolean;
  capabilityMatched: boolean;
  matchedNaics: string[];
  matchedKeywords: string[];
}

// ─── Relevance Check ────────────────────────────────────────────────────────
// An opportunity is relevant if it has at least one NAICS overlap (4-digit
// prefix match) with either company OR at least one capability keyword match
// in the description. Opportunities with no NAICS codes pass the NAICS check
// automatically (unknown = neutral) and relevance depends on keywords only.

export function isRelevantOpportunity(
  naicsCodes: string[],
  description: string
): RelevanceResult {
  // NAICS match using 4-digit prefix (same logic as calculateFitScore)
  const matchedNaics =
    naicsCodes.length > 0
      ? naicsCodes.filter((code) =>
          COMBINED_NAICS.some(
            (c) =>
              code.startsWith(c.slice(0, 4)) || c.startsWith(code.slice(0, 4))
          )
        )
      : [];

  // If opportunity has no NAICS codes, treat as unknown (passes NAICS gate)
  const naicsMatched =
    naicsCodes.length === 0 ? true : matchedNaics.length > 0;

  // Capability keyword match
  const descLower = description.toLowerCase();
  const matchedKeywords = CAPABILITY_KEYWORDS.filter((k) =>
    descLower.includes(k)
  );
  const capabilityMatched = matchedKeywords.length > 0;

  // Relevant if at least one dimension matches
  const relevant = naicsMatched || capabilityMatched;

  return {
    relevant,
    naicsMatched,
    capabilityMatched,
    matchedNaics,
    matchedKeywords,
  };
}
