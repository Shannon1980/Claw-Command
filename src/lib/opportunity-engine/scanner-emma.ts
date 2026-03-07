import type { QualifiedOpportunity, ScanResult } from "./types";
import {
  calculateFitScore,
  calculateWinProbability,
  routeAction,
} from "./scoring";
import { computeDedupeHash } from "./dedup";

// ─── EMMA (Electronic Municipal Market Access) Scanner ─────────────────────
// EMMA is operated by the MSRB (Municipal Securities Rulemaking Board)
// https://emma.msrb.org/
// Provides municipal bond and continuing disclosure data

const EMMA_API_BASE = "https://emma.msrb.org/api";

interface EmmaIssue {
  issueId?: string;
  issueName?: string;
  issuerName?: string;
  issuerState?: string;
  maturityDate?: string;
  parAmount?: number;
  couponRate?: number;
  issueDate?: string;
  issueType?: string;
  securityType?: string;
  description?: string;
  cusip?: string;
}

interface EmmaSearchResponse {
  issues?: EmmaIssue[];
  totalCount?: number;
}

export async function scanEmma(
  existingHashes: Set<string>
): Promise<ScanResult> {
  const now = new Date().toISOString();
  const opportunities: QualifiedOpportunity[] = [];
  let totalFound = 0;
  let duplicatesSkipped = 0;

  try {
    // Search for recent municipal issues, particularly MD-related
    // EMMA provides municipal securities data - we look for new issues
    // that may indicate upcoming IT/consulting procurement needs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString().split("T")[0];
    const toDate = new Date().toISOString().split("T")[0];

    const params = new URLSearchParams({
      fromDate,
      toDate,
      state: "MD",
      limit: "50",
    });

    const response = await fetch(
      `${EMMA_API_BASE}/search/issues?${params}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`EMMA API returned ${response.status}`);
    }

    const data: EmmaSearchResponse = await response.json();
    const issues = data.issues || [];
    totalFound = data.totalCount || issues.length;

    for (const issue of issues) {
      const title = issue.issueName || issue.description || "";
      if (!title) continue;

      const agency = issue.issuerName || "Maryland Municipal Issuer";
      const amount = issue.parAmount || 0;
      const deadline = issue.maturityDate || "";

      // Deduplication
      const hash = await computeDedupeHash(title, agency, amount, deadline);
      if (existingHashes.has(hash)) {
        duplicatesSkipped++;
        continue;
      }

      // Days until maturity (for bond issues)
      const deadlineDate = deadline ? new Date(deadline) : null;
      const daysUntilClose = deadlineDate
        ? Math.ceil(
            (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        : 999;

      const description =
        issue.description ||
        `${issue.issueType || "Municipal"} issue: ${title}`;
      const naicsCodes: string[] = [];

      // Municipal bond issues can signal upcoming IT/consulting needs
      const isMongoCounty = agency.toLowerCase().includes("montgomery");

      const { score: fitScore, breakdown: fitBreakdown } = calculateFitScore(
        naicsCodes,
        "",
        description,
        false
      );

      const { probability: winProbability, breakdown: winBreakdown } =
        calculateWinProbability(fitScore, false, isMongoCounty, 8);

      const { action, channel } = routeAction(
        fitScore,
        winProbability,
        daysUntilClose,
        false,
        "",
        amount
      );

      const winThemes: string[] = [];
      if (isMongoCounty) {
        winThemes.push("Local presence and community knowledge");
      }
      winThemes.push("Municipal finance technology expertise");

      const cusipSlug = issue.cusip || issue.issueId || hash.slice(0, 12);

      opportunities.push({
        id: `emma-${cusipSlug}`,
        title,
        agency,
        amount,
        deadline,
        daysUntilClose,
        naicsCodes,
        setAsideType: issue.securityType || "",
        source: "emma_msrb",
        sourceUrl: issue.cusip
          ? `https://emma.msrb.org/IssueView/Details/${issue.cusip}`
          : "https://emma.msrb.org",
        solicitationNumber: issue.cusip || "",
        description: description.slice(0, 500),
        fitScore,
        winProbability,
        action,
        channel,
        fitBreakdown,
        winBreakdown,
        winThemes,
        dedupeHash: hash,
        scannedAt: now,
        qualifiedAt: now,
      });
    }
  } catch (error) {
    console.error("[OpportunityEngine] EMMA scan error:", error);
  }

  return {
    opportunities,
    source: "emma_msrb",
    scannedAt: now,
    totalFound,
    qualifiedCount: opportunities.filter(
      (o) =>
        o.action === "CAPTURE_NOW" ||
        o.action === "CAPTURE_NOW_TEAM_SKYWARD" ||
        o.action === "CAPTURE_NOW_TEAM_VORENTOE"
    ).length,
    duplicatesSkipped,
  };
}
