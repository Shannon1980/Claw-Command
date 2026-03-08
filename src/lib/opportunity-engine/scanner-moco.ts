import type { QualifiedOpportunity, ScanResult } from "./types";
import {
  calculateFitScore,
  calculateWinProbability,
  routeAction,
} from "./scoring";
import { computeDedupeHash } from "./dedup";

// ─── Montgomery County MD Procurement Scanner ──────────────────────────────
// Uses the Montgomery County MD Open Data / eProcurement API
// https://data.montgomerycountymd.gov/
//
// Dataset: Active/Open Solicitations
// The dataset ID is for the "Solicitations" dataset on the MoCo open data portal.
// Falls back to the general contracts dataset if the primary one is unavailable.

const MOCO_SOLICITATIONS_URL =
  "https://data.montgomerycountymd.gov/resource/dvt3-7y7y.json";
const MOCO_CONTRACTS_URL =
  "https://data.montgomerycountymd.gov/resource/23hs-bne9.json";

interface MocoSolicitation {
  solicitation_number?: string;
  solicitation_title?: string;
  description?: string;
  department?: string;
  due_date?: string;
  posted_date?: string;
  estimated_value?: string;
  category?: string;
  status?: string;
  solicitation_type?: string;
}

interface MocoContract {
  contract_number?: string;
  contract_description?: string;
  department?: string;
  start_date?: string;
  end_date?: string;
  award_amount?: string;
  contract_type?: string;
  vendor_name?: string;
}

async function tryFetchSolicitations(
  headers: Record<string, string>
): Promise<{ data: MocoSolicitation[]; url: string } | null> {
  const params = new URLSearchParams({
    $where: "status = 'Open'",
    $limit: "100",
    $order: "posted_date DESC",
  });

  const response = await fetch(`${MOCO_SOLICITATIONS_URL}?${params}`, {
    headers,
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    return null;
  }

  // Validate that at least some records have expected fields
  if (data.length > 0) {
    const first = data[0];
    const hasExpectedFields =
      "solicitation_title" in first ||
      "solicitation_number" in first ||
      "description" in first;
    if (!hasExpectedFields) {
      return null;
    }
  }

  return { data, url: MOCO_SOLICITATIONS_URL };
}

async function tryFetchContracts(
  headers: Record<string, string>
): Promise<{ data: MocoContract[]; url: string } | null> {
  // Fallback: fetch recent contracts to identify procurement activity
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);
  const fromDate = thirtyDaysAgo.toISOString().split("T")[0];

  const params = new URLSearchParams({
    $where: `start_date >= '${fromDate}'`,
    $limit: "100",
    $order: "start_date DESC",
  });

  const response = await fetch(`${MOCO_CONTRACTS_URL}?${params}`, {
    headers,
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    return null;
  }

  return { data, url: MOCO_CONTRACTS_URL };
}

export async function scanMontgomeryCounty(
  existingHashes: Set<string>
): Promise<ScanResult> {
  const now = new Date().toISOString();
  const opportunities: QualifiedOpportunity[] = [];
  let totalFound = 0;
  let duplicatesSkipped = 0;

  try {
    // Add app token if available (increases rate limits)
    const appToken = process.env.MOCO_APP_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (appToken) {
      headers["X-App-Token"] = appToken;
    }

    // Try the solicitations dataset first
    const solicitations = await tryFetchSolicitations(headers);

    if (solicitations && solicitations.data.length > 0) {
      // Process solicitations (preferred data source)
      totalFound = solicitations.data.length;

      for (const sol of solicitations.data) {
        const title = sol.solicitation_title || sol.description || "";
        if (!title) continue;

        const agency = `Montgomery County MD - ${sol.department || "General"}`;
        const amount = parseFloat(sol.estimated_value || "0") || 0;
        const deadline = sol.due_date || "";

        const hash = await computeDedupeHash(title, agency, amount, deadline);
        if (existingHashes.has(hash)) {
          duplicatesSkipped++;
          continue;
        }

        const deadlineDate = deadline ? new Date(deadline) : null;
        const daysUntilClose = deadlineDate
          ? Math.ceil(
              (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
          : 999;
        if (daysUntilClose < 0) continue;

        const description = sol.description || title;
        const naicsCodes: string[] = [];

        const { score: fitScore, breakdown: fitBreakdown } = calculateFitScore(
          naicsCodes,
          "",
          description,
          false
        );

        const { probability: winProbability, breakdown: winBreakdown } =
          calculateWinProbability(fitScore, false, true, 5);

        const { action, channel } = routeAction(
          fitScore,
          winProbability,
          daysUntilClose,
          false,
          "",
          amount
        );

        const winThemes = [
          "Local presence and community knowledge",
          "LSBRP certification advantage",
        ];

        opportunities.push({
          id: `moco-${sol.solicitation_number || hash.slice(0, 12)}`,
          title,
          agency,
          amount,
          deadline,
          daysUntilClose,
          naicsCodes,
          setAsideType: sol.category || "",
          source: "montgomery_county_md",
          sourceUrl: `https://www.montgomerycountymd.gov/PRO/divisions/eprocurement.html`,
          solicitationNumber: sol.solicitation_number || "",
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
    } else {
      // Fallback: try the contracts dataset for procurement intelligence
      const contracts = await tryFetchContracts(headers);

      if (contracts && contracts.data.length > 0) {
        totalFound = contracts.data.length;

        for (const contract of contracts.data) {
          const title = contract.contract_description || "";
          if (!title) continue;

          const agency = `Montgomery County MD - ${contract.department || "General"}`;
          const amount = parseFloat(contract.award_amount || "0") || 0;
          const deadline = contract.end_date || "";

          const hash = await computeDedupeHash(title, agency, amount, deadline);
          if (existingHashes.has(hash)) {
            duplicatesSkipped++;
            continue;
          }

          const deadlineDate = deadline ? new Date(deadline) : null;
          const daysUntilClose = deadlineDate
            ? Math.ceil(
                (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
            : 999;

          const description = title;
          const naicsCodes: string[] = [];

          const { score: fitScore, breakdown: fitBreakdown } = calculateFitScore(
            naicsCodes,
            "",
            description,
            false
          );

          const { probability: winProbability, breakdown: winBreakdown } =
            calculateWinProbability(fitScore, false, true, 5);

          const { action, channel } = routeAction(
            fitScore,
            winProbability,
            daysUntilClose,
            false,
            "",
            amount
          );

          const winThemes = [
            "Local presence and community knowledge",
            "LSBRP certification advantage",
          ];

          opportunities.push({
            id: `moco-${contract.contract_number || hash.slice(0, 12)}`,
            title,
            agency,
            amount,
            deadline,
            daysUntilClose,
            naicsCodes,
            setAsideType: contract.contract_type || "",
            source: "montgomery_county_md",
            sourceUrl: `https://www.montgomerycountymd.gov/PRO/divisions/eprocurement.html`,
            solicitationNumber: contract.contract_number || "",
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
      } else {
        // Both datasets failed or returned empty
        throw new Error(
          "Montgomery County solicitations dataset (dvt3-7y7y) returned no results and contracts fallback (23hs-bne9) also failed. " +
          "The dataset IDs may have changed — check https://data.montgomerycountymd.gov for current procurement datasets."
        );
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[OpportunityEngine] Montgomery County scan error:", message);
    return {
      opportunities: [],
      source: "montgomery_county_md",
      scannedAt: now,
      totalFound: 0,
      qualifiedCount: 0,
      duplicatesSkipped: 0,
      error: `Montgomery County scan failed: ${message}`,
    };
  }

  return {
    opportunities,
    source: "montgomery_county_md",
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
