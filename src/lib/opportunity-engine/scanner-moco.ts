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

const MOCO_API_BASE =
  "https://data.montgomerycountymd.gov/resource/dvt3-7y7y.json";

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

export async function scanMontgomeryCounty(
  existingHashes: Set<string>
): Promise<ScanResult> {
  const now = new Date().toISOString();
  const opportunities: QualifiedOpportunity[] = [];
  let totalFound = 0;
  let duplicatesSkipped = 0;

  try {
    // Fetch open solicitations from Montgomery County Open Data
    const params = new URLSearchParams({
      $where: "status = 'Open'",
      $limit: "100",
      $order: "posted_date DESC",
    });

    // Add app token if available
    const appToken = process.env.MOCO_APP_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (appToken) {
      headers["X-App-Token"] = appToken;
    }

    const response = await fetch(`${MOCO_API_BASE}?${params}`, { headers });
    if (!response.ok) {
      throw new Error(`Montgomery County API returned ${response.status}`);
    }

    const data: MocoSolicitation[] = await response.json();
    totalFound = data.length;

    for (const sol of data) {
      const title = sol.solicitation_title || sol.description || "";
      if (!title) continue;

      const agency = `Montgomery County MD - ${sol.department || "General"}`;
      const amount = parseFloat(sol.estimated_value || "0") || 0;
      const deadline = sol.due_date || "";

      // Deduplication
      const hash = await computeDedupeHash(title, agency, amount, deadline);
      if (existingHashes.has(hash)) {
        duplicatesSkipped++;
        continue;
      }

      // Days until close
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
  } catch (error) {
    console.error("[OpportunityEngine] Montgomery County scan error:", error);
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
