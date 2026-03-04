// Mock data for Skyward IT workstreams

export type WorkstreamStatus = "on_track" | "at_risk" | "blocked";

export interface Milestone {
  id: string;
  name: string;
  date: string;
  completed: boolean;
}

export interface Workstream {
  id: string;
  name: string;
  status: WorkstreamStatus;
  description: string;
  owner: string;
  milestones: Milestone[];
  riskFactors?: string[];
}

export const getWorkstreams = (): Workstream[] => [
  {
    id: "ws1",
    name: "SEAS IT Infrastructure Migration",
    status: "on_track",
    description:
      "Migrating legacy infrastructure to cloud-native architecture. Currently at 75% completion.",
    owner: "Skylar 🌤️",
    milestones: [
      { id: "m1", name: "Architecture Design", date: "2025-12-15", completed: true },
      { id: "m2", name: "Pilot Environment Setup", date: "2026-01-30", completed: true },
      { id: "m3", name: "Phase 1 Migration", date: "2026-02-28", completed: true },
      { id: "m4", name: "Phase 2 Migration", date: "2026-03-31", completed: false },
      { id: "m5", name: "Final Cutover", date: "2026-04-15", completed: false },
    ],
  },
  {
    id: "ws2",
    name: "CMS Portal Modernization",
    status: "at_risk",
    description:
      "Updating the CMS customer portal with modern UI/UX. Facing resource constraints.",
    owner: "Skylar 🌤️",
    milestones: [
      { id: "m6", name: "Requirements Gathering", date: "2025-11-30", completed: true },
      { id: "m7", name: "Design Mockups", date: "2026-01-15", completed: true },
      { id: "m8", name: "Backend API Development", date: "2026-02-28", completed: false },
      { id: "m9", name: "Frontend Development", date: "2026-03-31", completed: false },
      { id: "m10", name: "UAT & Launch", date: "2026-04-30", completed: false },
    ],
    riskFactors: [
      "Frontend developer on leave until March 15",
      "Scope creep from stakeholder feedback",
      "Dependency on SEAS infrastructure for API hosting",
    ],
  },
  {
    id: "ws3",
    name: "Security Compliance Audit",
    status: "on_track",
    description:
      "Annual security compliance review and remediation for FedRAMP Moderate baseline.",
    owner: "Skylar 🌤️",
    milestones: [
      { id: "m11", name: "Audit Kickoff", date: "2026-01-05", completed: true },
      { id: "m12", name: "Initial Assessment", date: "2026-01-31", completed: true },
      { id: "m13", name: "Remediation Plan", date: "2026-02-15", completed: true },
      { id: "m14", name: "Remediation Execution", date: "2026-03-15", completed: false },
      { id: "m15", name: "Final Report", date: "2026-03-31", completed: false },
    ],
  },
  {
    id: "ws4",
    name: "Data Analytics Platform",
    status: "blocked",
    description:
      "Building enterprise analytics platform for CMS program data. Blocked on vendor selection.",
    owner: "Skylar 🌤️",
    milestones: [
      { id: "m16", name: "RFP Development", date: "2025-12-20", completed: true },
      { id: "m17", name: "Vendor Evaluation", date: "2026-02-15", completed: false },
      { id: "m18", name: "Vendor Selection", date: "2026-03-01", completed: false },
      { id: "m19", name: "Platform Setup", date: "2026-04-30", completed: false },
      { id: "m20", name: "Initial Data Integration", date: "2026-05-31", completed: false },
    ],
    riskFactors: [
      "Vendor proposals delayed by 6 weeks",
      "Budget approval pending executive review",
      "Technical requirements still under refinement",
    ],
  },
];
