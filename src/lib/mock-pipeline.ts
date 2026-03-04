export interface Opportunity {
  id: string;
  title: string;
  stage: string;
  valueUsd: number; // cents
  probability: number; // 0-100
  ownerAgent: string;
  ownerEmoji: string;
  shannonApproval: boolean | null; // null = pending
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

export const mockOpportunities: Opportunity[] = [
  {
    id: "opp-dhs-border",
    title: "DHS Border Technology Modernization",
    stage: "qualify",
    valueUsd: 250000000,
    probability: 40,
    ownerAgent: "Bertha",
    ownerEmoji: "💼",
    shannonApproval: null,
  },
  {
    id: "opp-va-digital",
    title: "VA Digital Transformation",
    stage: "capture",
    valueUsd: 410000000,
    probability: 60,
    ownerAgent: "Bertha",
    ownerEmoji: "💼",
    shannonApproval: true,
  },
  {
    id: "opp-navy-cyber",
    title: "Navy Cybersecurity Operations",
    stage: "propose",
    valueUsd: 180000000,
    probability: 75,
    ownerAgent: "Bertha",
    ownerEmoji: "💼",
    shannonApproval: true,
  },
  {
    id: "opp-disa-cloud",
    title: "DISA Cloud Migration",
    stage: "win",
    valueUsd: 320000000,
    probability: 95,
    ownerAgent: "Bertha",
    ownerEmoji: "💼",
    shannonApproval: true,
  },
  {
    id: "opp-army-netcom",
    title: "Army NETCOM IT Services",
    stage: "identify",
    valueUsd: 89000000,
    probability: 20,
    ownerAgent: "Depa",
    ownerEmoji: "📊",
    shannonApproval: null,
  },
  {
    id: "opp-sba-wosb",
    title: "SBA WOSB Portal Enhancement",
    stage: "win",
    valueUsd: 65000000,
    probability: 100,
    ownerAgent: "Bertha",
    ownerEmoji: "💼",
    shannonApproval: true,
  },
];

export const mockApplications: Application[] = [
  {
    id: "app-notetaker",
    title: "NoteTaker AI",
    stage: "mvp",
    description: "AI-powered meeting note taker with action item extraction",
    ownerAgent: "Forge",
    ownerEmoji: "⚙️",
    dependenciesCount: 3,
    shannonApproval: true,
  },
  {
    id: "app-govforecast",
    title: "GovForecast",
    stage: "prototype",
    description:
      "Government contract opportunity forecasting and analysis platform",
    ownerAgent: "Forge",
    ownerEmoji: "⚙️",
    dependenciesCount: 5,
    shannonApproval: true,
  },
  {
    id: "app-busybee",
    title: "BusyBee",
    stage: "concept",
    description: "Productivity tracker for distributed teams",
    ownerAgent: "Atlas",
    ownerEmoji: "🖥️",
    dependenciesCount: 0,
    shannonApproval: null,
  },
  {
    id: "app-community-board",
    title: "Community Board",
    stage: "design",
    description:
      "Neighborhood organizing and event coordination platform",
    ownerAgent: "Atlas",
    ownerEmoji: "🖥️",
    dependenciesCount: 2,
    shannonApproval: null,
  },
];

export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toFixed(0)}`;
}
