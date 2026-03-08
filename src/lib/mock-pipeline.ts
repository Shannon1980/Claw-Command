export interface OpportunityAttachment {
  name: string;
  url: string;
  type: string; // pdf, docx, xlsx, etc.
  addedAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  stage: string;
  valueUsd: number; // cents
  probability: number; // 0-100
  ownerAgent: string;
  ownerEmoji: string;
  shannonApproval: boolean | null; // null = pending
  source: string; // sam_gov | montgomery_county_md | emma_msrb | manual
  sourceUrl: string;
  sourceId: string;
  agency: string;
  deadline: string;
  // Extended detail fields
  description: string;
  solicitationNumber: string;
  setAsideType: string;
  naicsCodes: string[];
  fitScore: number;        // 0-10
  winThemes: string[];
  opsEngineAction: string; // CAPTURE_NOW, WATCH, PASS, etc.
  channel: string;         // direct, teaming_skyward_prime, teaming_vorentoe_prime
  attachments: OpportunityAttachment[];
}

export interface Application {
  id: string;
  title: string;
  stage: string;
  description: string;
  ownerAgent: string;
  ownerEmoji: string;
  dependenciesCount: number;
  shannonApproval: boolean | null;
}

export const BD_STAGES = [
  "identify",
  "qualify",
  "capture",
  "propose",
  "win",
  "lost",
] as const;

export const APP_STAGES = [
  "concept",
  "design",
  "prototype",
  "mvp",
  "testflight",
  "submission",
  "live",
] as const;

export const STAGE_COLORS: Record<string, string> = {
  identify: "border-t-gray-500",
  qualify: "border-t-blue-500",
  capture: "border-t-cyan-500",
  propose: "border-t-purple-500",
  win: "border-t-green-500",
  lost: "border-t-red-500",
  concept: "border-t-gray-500",
  design: "border-t-pink-500",
  prototype: "border-t-blue-500",
  mvp: "border-t-cyan-500",
  testflight: "border-t-amber-500",
  submission: "border-t-purple-500",
  live: "border-t-green-500",
};

export const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  sam_gov: { label: "SAM.gov", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  montgomery_county_md: { label: "MoCo MD", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  emma_msrb: { label: "EMMA", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  emaryland: { label: "eMaryland", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  eva_virginia: { label: "eVA", color: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
  dc_ocp: { label: "DC OCP", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  naspo: { label: "NASPO", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  fpds_ng: { label: "FPDS-NG", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  ops_engine: { label: "Ops Engine", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  manual: { label: "Manual", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toFixed(0)}`;
}
