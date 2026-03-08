import type {
  QualifiedOpportunity,
  ScanResult,
  OpportunitySource,
} from "./types";
import {
  calculateFitScore,
  calculateWinProbability,
  routeAction,
  detectSegment,
} from "./scoring";
import { computeDedupeHash } from "./dedup";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateMMDDYYYY(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

// ─── SAM.gov Scanner ────────────────────────────────────────────────────────

interface SamGovOpportunity {
  noticeId: string;
  title: string;
  solicitationNumber: string;
  department: string;
  subtier: string;
  office: string;
  postedDate: string;
  type: string;
  baseType: string;
  archiveType: string;
  archiveDate: string;
  setAside: string;
  setAsideDescription: string;
  responseDeadLine: string;
  naicsCode: string;
  classificationCode: string;
  active: string;
  description: string;
  organizationType: string;
  uiLink: string;
  award?: {
    amount: number;
  };
  pointOfContact?: Array<{
    fullName: string;
    email: string;
    phone: string;
  }>;
}

interface SamGovResponse {
  totalRecords: number;
  opportunitiesData: SamGovOpportunity[];
}

const SAM_GOV_API_BASE = "https://api.sam.gov/opportunities/v2/search";

export async function scanSamGov(
  apiKey: string,
  existingHashes: Set<string>
): Promise<ScanResult> {
  const now = new Date().toISOString();
  const opportunities: QualifiedOpportunity[] = [];
  let totalFound = 0;
  let duplicatesSkipped = 0;

  try {
    // Fetch active solicitations posted in the last 30 days
    const postedFrom = new Date();
    postedFrom.setDate(postedFrom.getDate() - 30);
    const postedFromStr = formatDateMMDDYYYY(postedFrom);
    const postedToStr = formatDateMMDDYYYY(new Date());

    const params = new URLSearchParams({
      api_key: apiKey,
      postedFrom: postedFromStr,
      postedTo: postedToStr,
      limit: "100",
      offset: "0",
      ptype: "o,k", // Solicitations + Combined
    });

    const response = await fetch(`${SAM_GOV_API_BASE}?${params}`);
    if (!response.ok) {
      throw new Error(`SAM.gov API returned ${response.status}`);
    }

    const data: SamGovResponse = await response.json();
    totalFound = data.totalRecords || 0;

    for (const opp of data.opportunitiesData || []) {
      const amount = opp.award?.amount || 0;
      const deadline = opp.responseDeadLine || opp.archiveDate || "";
      const naicsCodes = opp.naicsCode ? [opp.naicsCode] : [];
      const agency = `${opp.department || ""} ${opp.subtier || ""} ${opp.office || ""}`.trim();

      // Deduplication
      const hash = await computeDedupeHash(
        opp.title,
        agency,
        amount,
        deadline
      );
      if (existingHashes.has(hash)) {
        duplicatesSkipped++;
        continue;
      }

      // Calculate days until close
      const deadlineDate = deadline ? new Date(deadline) : null;
      const daysUntilClose = deadlineDate
        ? Math.ceil(
            (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        : 999;

      if (daysUntilClose < 0) continue; // Skip expired

      // Detect market segment
      const { isFederal, isMongoCounty } = detectSegment(
        agency,
        opp.description || opp.title
      );

      // Calculate scores
      const { score: fitScore, breakdown: fitBreakdown } = calculateFitScore(
        naicsCodes,
        opp.setAsideDescription || opp.setAside || "",
        opp.description || opp.title,
        isFederal
      );

      const { probability: winProbability, breakdown: winBreakdown } =
        calculateWinProbability(fitScore, isFederal, isMongoCounty, 10);

      const setAside = opp.setAsideDescription || opp.setAside || "";
      const { action, channel } = routeAction(
        fitScore,
        winProbability,
        daysUntilClose,
        isFederal,
        setAside,
        amount
      );

      // Generate win themes
      const winThemes = generateWinThemes(
        opp.title,
        opp.description || "",
        channel,
        isMongoCounty
      );

      opportunities.push({
        id: `sam-${opp.noticeId}`,
        title: opp.title,
        agency,
        amount,
        deadline,
        daysUntilClose,
        naicsCodes,
        setAsideType: opp.setAsideDescription || opp.setAside || "",
        source: "sam_gov",
        sourceUrl: opp.uiLink || "",
        solicitationNumber: opp.solicitationNumber || "",
        description: (opp.description || "").slice(0, 500),
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
    console.error("[OpportunityEngine] SAM.gov scan error:", error);
  }

  return {
    opportunities,
    source: "sam_gov",
    scannedAt: now,
    totalFound,
    qualifiedCount: opportunities.filter(
      (o) =>
        o.action === "CAPTURE_NOW" || o.action === "CAPTURE_NOW_TEAM_SKYWARD" || o.action === "CAPTURE_NOW_TEAM_VORENTOE"
    ).length,
    duplicatesSkipped,
  };
}

// ─── Win Theme Generation ───────────────────────────────────────────────────

function generateWinThemes(
  title: string,
  description: string,
  channel: "direct" | "teaming_skyward_prime" | "teaming_vorentoe_prime",
  isMongoCounty: boolean
): string[] {
  const themes: string[] = [];
  const text = `${title} ${description}`.toLowerCase();

  if (isMongoCounty) {
    themes.push("Local presence and community knowledge");
    themes.push("LSBRP certification advantage");
  }

  if (channel === "teaming_skyward_prime") {
    themes.push("Skyward 8(a) federal authority");
    themes.push("GSA schedule contract access");
  }

  if (channel === "teaming_vorentoe_prime") {
    themes.push("EDWOSB certification advantage");
    themes.push("Vorentoe as prime with Skyward support");
  }

  if (text.includes("cloud") || text.includes("migration")) {
    themes.push("Cloud migration expertise");
  }
  if (text.includes("ai") || text.includes("artificial intelligence")) {
    themes.push("AI/ML implementation capability");
  }
  if (text.includes("cyber") || text.includes("security")) {
    themes.push("Cybersecurity compliance (CMMI/ISO)");
  }
  if (text.includes("data") || text.includes("analytics")) {
    themes.push("Data analytics platform experience");
  }
  if (text.includes("moderniz") || text.includes("digital")) {
    themes.push("Digital transformation track record");
  }
  if (text.includes("support") || text.includes("help desk")) {
    themes.push("IT support services delivery");
  }
  if (text.includes("training") || text.includes("education")) {
    themes.push("Professional development programs");
  }

  return themes.slice(0, 4);
}

// ─── Multi-Source Scanner ────────────────────────────────────────────────────

import { scanMontgomeryCounty } from "./scanner-moco";
import { scanEmma } from "./scanner-emma";

export async function scanAllSources(
  samApiKey: string | null,
  existingHashes: Set<string>
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  // Run all scanners concurrently
  const promises: Promise<ScanResult>[] = [];

  if (samApiKey) {
    promises.push(scanSamGov(samApiKey, existingHashes));
  }

  // Montgomery County MD procurement
  promises.push(scanMontgomeryCounty(existingHashes));

  // EMMA (MSRB municipal securities)
  promises.push(scanEmma(existingHashes));

  // Track which source each promise corresponds to for error attribution
  const sourceLabels: string[] = [];
  if (samApiKey) sourceLabels.push("sam_gov");
  sourceLabels.push("montgomery_county_md");
  sourceLabels.push("emma_msrb");

  const settled = await Promise.allSettled(promises);
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else {
      const source = sourceLabels[i] || "unknown";
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.error(`[OpportunityEngine] ${source} scanner crashed:`, reason);
      results.push({
        opportunities: [],
        source: source as import("./types").OpportunitySource,
        scannedAt: new Date().toISOString(),
        totalFound: 0,
        qualifiedCount: 0,
        duplicatesSkipped: 0,
        error: `${source} scanner crashed: ${reason}`,
      });
    }
  }

  return results;
}
