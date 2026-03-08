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
//
// We use the public EMMA search page's JSON endpoint which does not require
// an API key. It returns recent municipal securities issues for a given state.

const EMMA_SEARCH_URL = "https://emma.msrb.org/Search/Search";

interface EmmaSearchResult {
  IssueId?: string;
  IssueName?: string;
  IssuerName?: string;
  State?: string;
  MaturityDate?: string;
  ParAmount?: number;
  CouponRate?: number;
  IssueDate?: string;
  IssueType?: string;
  SecurityType?: string;
  Description?: string;
  Cusip6?: string;
  Cusip9?: string;
}

interface EmmaSearchResponse {
  Results?: EmmaSearchResult[];
  TotalResultCount?: number;
}

export async function scanEmma(
  existingHashes: Set<string>
): Promise<ScanResult> {
  const now = new Date().toISOString();
  const opportunities: QualifiedOpportunity[] = [];
  let totalFound = 0;
  let duplicatesSkipped = 0;

  try {
    // Search for recent MD municipal issues from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString().split("T")[0];
    const toDate = new Date().toISOString().split("T")[0];

    // Use the EMMA search endpoint with form-encoded parameters
    const body = new URLSearchParams({
      DateFrom: fromDate,
      DateTo: toDate,
      State: "MD",
      PageSize: "50",
      PageNumber: "1",
    });

    const response = await fetch(EMMA_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const statusText = response.statusText || "Unknown error";
      throw new Error(
        `EMMA API returned ${response.status} ${statusText}`
      );
    }

    // Validate response is JSON
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      throw new Error(
        `EMMA API returned unexpected content type: ${contentType}. The endpoint may have changed.`
      );
    }

    const data: EmmaSearchResponse = await response.json();
    const issues = data.Results || [];
    totalFound = data.TotalResultCount || issues.length;

    if (totalFound === 0 && issues.length === 0) {
      // Not an error, but worth noting — may indicate API returned HTML instead of JSON
      console.info("[OpportunityEngine] EMMA returned 0 results for MD in last 30 days");
    }

    for (const issue of issues) {
      const title = issue.IssueName || issue.Description || "";
      if (!title) continue;

      const agency = issue.IssuerName || "Maryland Municipal Issuer";
      const amount = issue.ParAmount || 0;
      const deadline = issue.MaturityDate || "";

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
        issue.Description ||
        `${issue.IssueType || "Municipal"} issue: ${title}`;
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

      const cusipSlug = issue.Cusip9 || issue.Cusip6 || issue.IssueId || hash.slice(0, 12);

      opportunities.push({
        id: `emma-${cusipSlug}`,
        title,
        agency,
        amount,
        deadline,
        daysUntilClose,
        naicsCodes,
        setAsideType: issue.SecurityType || "",
        source: "emma_msrb",
        sourceUrl: issue.Cusip9
          ? `https://emma.msrb.org/IssueView/Details/${issue.Cusip9}`
          : "https://emma.msrb.org",
        solicitationNumber: issue.Cusip9 || issue.Cusip6 || "",
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
    const message = error instanceof Error ? error.message : String(error);
    console.error("[OpportunityEngine] EMMA scan error:", message);
    return {
      opportunities: [],
      source: "emma_msrb",
      scannedAt: now,
      totalFound: 0,
      qualifiedCount: 0,
      duplicatesSkipped: 0,
      error: `EMMA scan failed: ${message}`,
    };
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
