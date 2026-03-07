// ─── Opportunity Engine Types ───────────────────────────────────────────────

export type OpportunitySource =
  | "sam_gov"
  | "fpds_ng"
  | "emaryland"
  | "eva_virginia"
  | "dc_ocp"
  | "naspo";

export type OpportunityChannel = "direct" | "teaming_skyward_prime" | "teaming_vorentoe_prime";

export type ActionRouting =
  | "CAPTURE_NOW"
  | "CAPTURE_NOW_TEAM_SKYWARD"
  | "CAPTURE_NOW_TEAM_VORENTOE"
  | "WATCH"
  | "PASS";

export interface QualifiedOpportunity {
  id: string;
  title: string;
  agency: string;
  amount: number; // USD
  deadline: string; // ISO date
  daysUntilClose: number;
  naicsCodes: string[];
  setAsideType: string; // e.g. "Small Business", "8(a)", "WOSB"
  source: OpportunitySource;
  sourceUrl: string;
  solicitationNumber: string;
  description: string;

  // Scoring
  fitScore: number; // 0-10
  winProbability: number; // 0-100
  action: ActionRouting;
  channel: OpportunityChannel;

  // Scoring breakdown
  fitBreakdown: FitBreakdown;
  winBreakdown: WinBreakdown;

  // Win themes from Depa intel
  winThemes: string[];

  // Deduplication
  dedupeHash: string;

  // Timestamps
  scannedAt: string;
  qualifiedAt: string;
}

export interface FitBreakdown {
  naicsMatch: number; // 0-10 (weight 40%)
  sizeEligibility: number; // 0-10 (weight 30%)
  capabilityMatch: number; // 0-10 (weight 30%)
}

export interface WinBreakdown {
  historicalWinRate: number; // 0-100 (weight 40%)
  competitiveIntensity: number; // 0-100 (weight 30%)
  segmentFamiliarity: number; // 0-100 (weight 30%)
}

export interface ScanResult {
  opportunities: QualifiedOpportunity[];
  source: OpportunitySource;
  scannedAt: string;
  totalFound: number;
  qualifiedCount: number;
  duplicatesSkipped: number;
}

export interface DashboardQueue {
  captureNowDirect: QualifiedOpportunity[];
  captureNowTeamSkyward: QualifiedOpportunity[];  // Skyward as prime, Vorentoe as partner
  captureNowTeamVorentoe: QualifiedOpportunity[]; // Vorentoe as prime, Skyward as partner
  watch: QualifiedOpportunity[];
  pass: QualifiedOpportunity[];
  lastScanAt: string;
  totalScanned: number;
}

export interface SkywardPartnerProfile {
  name: string;
  certifications: {
    sba8a: { certified: true; expiresDate: string };
    mbeSbeDb: boolean;
    gsaMas: string;
    gsa8aStarsIII: string;
    gsaOasisPlus: string;
    faaEfast: string;
    cmmiLevel3: boolean;
    iso9001: boolean;
    iso27001: boolean;
  };
  ids: {
    uei: string;
    cageCode: string;
    duns: string;
  };
  naicsCodes: string[]; // TBD - populated from SAM.gov
}
