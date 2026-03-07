import { NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import type { DashboardQueue, QualifiedOpportunity } from "@/lib/opportunity-engine/types";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS qualified_opportunities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      agency TEXT NOT NULL DEFAULT '',
      amount NUMERIC DEFAULT 0,
      deadline TEXT,
      days_until_close INTEGER DEFAULT 0,
      naics_codes TEXT NOT NULL DEFAULT '[]',
      set_aside_type TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'sam_gov',
      source_url TEXT NOT NULL DEFAULT '',
      solicitation_number TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      fit_score NUMERIC NOT NULL DEFAULT 0,
      win_probability INTEGER NOT NULL DEFAULT 0,
      action TEXT NOT NULL DEFAULT 'PASS',
      channel TEXT NOT NULL DEFAULT 'direct',
      fit_breakdown TEXT NOT NULL DEFAULT '{}',
      win_breakdown TEXT NOT NULL DEFAULT '{}',
      win_themes TEXT NOT NULL DEFAULT '[]',
      dedupe_hash TEXT NOT NULL UNIQUE,
      scanned_at TEXT NOT NULL,
      qualified_at TEXT NOT NULL
    );
  `);
  schemaReady = true;
}

function rowToOpportunity(r: Record<string, unknown>): QualifiedOpportunity {
  return {
    id: r.id as string,
    title: r.title as string,
    agency: r.agency as string,
    amount: Number(r.amount) || 0,
    deadline: (r.deadline as string) || "",
    daysUntilClose: Number(r.days_until_close) || 0,
    naicsCodes: JSON.parse((r.naics_codes as string) || "[]"),
    setAsideType: (r.set_aside_type as string) || "",
    source: (r.source as QualifiedOpportunity["source"]) || "sam_gov",
    sourceUrl: (r.source_url as string) || "",
    solicitationNumber: (r.solicitation_number as string) || "",
    description: (r.description as string) || "",
    fitScore: Number(r.fit_score) || 0,
    winProbability: Number(r.win_probability) || 0,
    action: (r.action as QualifiedOpportunity["action"]) || "PASS",
    channel: (r.channel as QualifiedOpportunity["channel"]) || "direct",
    fitBreakdown: JSON.parse((r.fit_breakdown as string) || "{}"),
    winBreakdown: JSON.parse((r.win_breakdown as string) || "{}"),
    winThemes: JSON.parse((r.win_themes as string) || "[]"),
    dedupeHash: (r.dedupe_hash as string) || "",
    scannedAt: (r.scanned_at as string) || "",
    qualifiedAt: (r.qualified_at as string) || "",
  };
}

export async function GET() {
  if (!pool) {
    // Return demo data when DB not configured
    return NextResponse.json(getDemoQueue());
  }

  try {
    await ensureSchema();

    const res = await pool.query(
      `SELECT * FROM qualified_opportunities ORDER BY fit_score DESC, win_probability DESC`
    );

    const all = res.rows.map(rowToOpportunity);
    const queue = buildQueue(all);
    return NextResponse.json(queue);
  } catch (error) {
    console.error("[OpportunityEngine API] Error:", error);
    return NextResponse.json(getDemoQueue());
  }
}

function buildQueue(opps: QualifiedOpportunity[]): DashboardQueue {
  return {
    captureNowDirect: opps.filter((o) => o.action === "CAPTURE_NOW"),
    captureNowTeamSkyward: opps.filter((o) => o.action === "CAPTURE_NOW_TEAM_SKYWARD"),
    captureNowTeamVorentoe: opps.filter((o) => o.action === "CAPTURE_NOW_TEAM_VORENTOE"),
    watch: opps.filter((o) => o.action === "WATCH"),
    pass: opps.filter((o) => o.action === "PASS"),
    lastScanAt: opps[0]?.scannedAt || new Date().toISOString(),
    totalScanned: opps.length,
  };
}

function getDemoQueue(): DashboardQueue {
  const now = new Date().toISOString();
  const demo: QualifiedOpportunity[] = [
    {
      id: "demo-moco-it-1",
      title: "Montgomery County IT Modernization Services",
      agency: "Montgomery County Government - DTS",
      amount: 450000,
      deadline: "2026-05-15",
      daysUntilClose: 69,
      naicsCodes: ["541512"],
      setAsideType: "Small Business",
      source: "emaryland",
      sourceUrl: "",
      solicitationNumber: "MC-2026-IT-0412",
      description: "IT modernization and cloud migration services for Montgomery County government departments.",
      fitScore: 9.2,
      winProbability: 68,
      action: "CAPTURE_NOW",
      channel: "direct",
      fitBreakdown: { naicsMatch: 10, sizeEligibility: 10, capabilityMatch: 8 },
      winBreakdown: { historicalWinRate: 55, competitiveIntensity: 80, segmentFamiliarity: 85 },
      winThemes: ["Local presence and community knowledge", "LSBRP certification advantage", "Cloud migration expertise"],
      dedupeHash: "demo-hash-1",
      scannedAt: now,
      qualifiedAt: now,
    },
    {
      id: "demo-moco-data-2",
      title: "MoCo Data Analytics Platform Support",
      agency: "Montgomery County - Office of Innovation",
      amount: 280000,
      deadline: "2026-04-30",
      daysUntilClose: 54,
      naicsCodes: ["541511", "518210"],
      setAsideType: "Small Business",
      source: "emaryland",
      sourceUrl: "",
      solicitationNumber: "MC-2026-DATA-0089",
      description: "Data analytics platform implementation and ongoing support for county operations.",
      fitScore: 8.8,
      winProbability: 62,
      action: "CAPTURE_NOW",
      channel: "direct",
      fitBreakdown: { naicsMatch: 9, sizeEligibility: 10, capabilityMatch: 8 },
      winBreakdown: { historicalWinRate: 55, competitiveIntensity: 60, segmentFamiliarity: 85 },
      winThemes: ["Local presence and community knowledge", "Data analytics platform experience"],
      dedupeHash: "demo-hash-2",
      scannedAt: now,
      qualifiedAt: now,
    },
    {
      id: "demo-fed-ai-3",
      title: "HHS AI/ML Platform Development",
      agency: "Department of Health and Human Services",
      amount: 2500000,
      deadline: "2026-05-30",
      daysUntilClose: 84,
      naicsCodes: ["541511", "541715"],
      setAsideType: "8(a)",
      source: "sam_gov",
      sourceUrl: "",
      solicitationNumber: "HHS-2026-AI-0523",
      description: "AI/ML platform development for health data analysis and predictive modeling.",
      fitScore: 7.8,
      winProbability: 52,
      action: "CAPTURE_NOW_TEAM_SKYWARD",
      channel: "teaming_skyward_prime",
      fitBreakdown: { naicsMatch: 8, sizeEligibility: 10, capabilityMatch: 7 },
      winBreakdown: { historicalWinRate: 25, competitiveIntensity: 60, segmentFamiliarity: 40 },
      winThemes: ["Skyward 8(a) federal authority", "GSA schedule contract access", "AI/ML implementation capability"],
      dedupeHash: "demo-hash-3",
      scannedAt: now,
      qualifiedAt: now,
    },
    {
      id: "demo-fed-cloud-4",
      title: "VA Cloud Infrastructure Modernization",
      agency: "Department of Veterans Affairs - OIT",
      amount: 4200000,
      deadline: "2026-06-15",
      daysUntilClose: 100,
      naicsCodes: ["541512", "518210"],
      setAsideType: "Total Small Business",
      source: "sam_gov",
      sourceUrl: "",
      solicitationNumber: "VA-2026-CLOUD-0891",
      description: "Cloud infrastructure modernization and migration services for VA healthcare systems.",
      fitScore: 7.2,
      winProbability: 48,
      action: "CAPTURE_NOW_TEAM_SKYWARD",
      channel: "teaming_skyward_prime",
      fitBreakdown: { naicsMatch: 8, sizeEligibility: 10, capabilityMatch: 6 },
      winBreakdown: { historicalWinRate: 25, competitiveIntensity: 60, segmentFamiliarity: 40 },
      winThemes: ["Skyward 8(a) federal authority", "Cloud migration expertise", "Digital transformation track record"],
      dedupeHash: "demo-hash-4",
      scannedAt: now,
      qualifiedAt: now,
    },
    {
      id: "demo-fed-edwosb-7",
      title: "USDA Legacy Modernization - COBOL to Cloud",
      agency: "United States Department of Agriculture - OCIO",
      amount: 750000,
      deadline: "2026-06-01",
      daysUntilClose: 86,
      naicsCodes: ["541511", "541512"],
      setAsideType: "EDWOSB",
      source: "sam_gov",
      sourceUrl: "",
      solicitationNumber: "USDA-2026-MOD-0267",
      description: "COBOL legacy system modernization and cloud migration for USDA agricultural reporting systems. EDWOSB set-aside.",
      fitScore: 7.5,
      winProbability: 58,
      action: "CAPTURE_NOW_TEAM_VORENTOE",
      channel: "teaming_vorentoe_prime",
      fitBreakdown: { naicsMatch: 10, sizeEligibility: 10, capabilityMatch: 8 },
      winBreakdown: { historicalWinRate: 25, competitiveIntensity: 80, segmentFamiliarity: 40 },
      winThemes: ["EDWOSB certification advantage", "COBOL-to-Cloud modernization expertise", "Vorentoe as prime with Skyward support"],
      dedupeHash: "demo-hash-7",
      scannedAt: now,
      qualifiedAt: now,
    },
    {
      id: "demo-watch-5",
      title: "GSA IT Professional Services BPA",
      agency: "General Services Administration",
      amount: 1800000,
      deadline: "2026-05-01",
      daysUntilClose: 55,
      naicsCodes: ["541511"],
      setAsideType: "Small Business",
      source: "sam_gov",
      sourceUrl: "",
      solicitationNumber: "GSA-2026-BPA-0334",
      description: "IT professional services blanket purchase agreement for federal agencies.",
      fitScore: 5.5,
      winProbability: 32,
      action: "WATCH",
      channel: "teaming_skyward_prime",
      fitBreakdown: { naicsMatch: 7, sizeEligibility: 10, capabilityMatch: 3 },
      winBreakdown: { historicalWinRate: 25, competitiveIntensity: 40, segmentFamiliarity: 40 },
      winThemes: ["GSA schedule contract access"],
      dedupeHash: "demo-hash-5",
      scannedAt: now,
      qualifiedAt: now,
    },
    {
      id: "demo-watch-6",
      title: "DC Office of Technology - Help Desk Support",
      agency: "District of Columbia - OCTO",
      amount: 320000,
      deadline: "2026-04-20",
      daysUntilClose: 44,
      naicsCodes: ["541513"],
      setAsideType: "Small Business",
      source: "dc_ocp",
      sourceUrl: "",
      solicitationNumber: "DC-2026-OCTO-0178",
      description: "Help desk and IT support services for DC government offices.",
      fitScore: 5.0,
      winProbability: 35,
      action: "WATCH",
      channel: "direct",
      fitBreakdown: { naicsMatch: 6, sizeEligibility: 10, capabilityMatch: 3 },
      winBreakdown: { historicalWinRate: 35, competitiveIntensity: 40, segmentFamiliarity: 50 },
      winThemes: ["IT support services delivery"],
      dedupeHash: "demo-hash-6",
      scannedAt: now,
      qualifiedAt: now,
    },
  ];

  return buildQueue(demo);
}
