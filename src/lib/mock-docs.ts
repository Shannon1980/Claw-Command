export type DocumentType =
  | "proposal"
  | "capability_statement"
  | "certification_doc"
  | "report"
  | "template";

export type DocumentStatus = "draft" | "in_review" | "approved" | "exported";

export type DocumentPriority = "critical" | "high" | "medium" | "low";

export type ReviewStatus = "pending_review" | "reviewed" | "needs_changes" | "approved" | "rejected";

export type DocumentCategory =
  | "govcon"
  | "internal"
  | "compliance"
  | "financial"
  | "technical"
  | "hr"
  | "marketing"
  | "legal"
  | "uncategorized";

export type AssignTarget = "memory" | "task" | "orchestration";

export interface LinkedItem {
  type: "deal" | "certification" | "task";
  id: string;
  name: string;
}

export interface VersionEntry {
  timestamp: string;
  summary: string;
}

export interface DocNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface DocAssignment {
  target: AssignTarget;
  targetId?: string;
  agentId?: string;
  instructions?: string;
  priority?: DocumentPriority;
  assignedAt: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  agent: string;
  agentEmoji: string;
  status: DocumentStatus;
  content: string;
  linkedTo?: LinkedItem[];
  createdAt: string;
  updatedAt: string;
  versionHistory?: VersionEntry[];
  priority?: DocumentPriority;
  reviewStatus?: ReviewStatus;
  category?: DocumentCategory;
  notes?: DocNote[];
  assignments?: DocAssignment[];
}

export const CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] = [
  { value: "govcon", label: "GovCon" },
  { value: "internal", label: "Internal" },
  { value: "compliance", label: "Compliance" },
  { value: "financial", label: "Financial" },
  { value: "technical", label: "Technical" },
  { value: "hr", label: "HR" },
  { value: "marketing", label: "Marketing" },
  { value: "legal", label: "Legal" },
  { value: "uncategorized", label: "Uncategorized" },
];

export const PRIORITY_OPTIONS: { value: DocumentPriority; label: string; color: string }[] = [
  { value: "critical", label: "Critical", color: "text-red-400" },
  { value: "high", label: "High", color: "text-orange-400" },
  { value: "medium", label: "Medium", color: "text-yellow-400" },
  { value: "low", label: "Low", color: "text-gray-400" },
];

export const REVIEW_STATUS_OPTIONS: { value: ReviewStatus; label: string }[] = [
  { value: "pending_review", label: "Pending Review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "needs_changes", label: "Needs Changes" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const SEED_DOCUMENTS: Document[] = [
  {
    id: "doc-1",
    title: "Vorentoe Capability Statement v2",
    type: "capability_statement",
    agent: "Muse",
    agentEmoji: "\u{1F3A8}",
    status: "approved",
    content: "# Vorentoe LLC - Capability Statement\n\n## Company Overview\nVorentoe LLC is an EDWOSB-certified technology consulting firm specializing in AI/ML solutions, IT program management, and government contracting services.\n\n## Core Capabilities\n- AI/ML Integration & Implementation\n- IT Program Management\n- Procurement Automation\n- Low-Code Platform Development\n- Cybersecurity Solutions\n\n## Past Performance\n- CMS SEAS IT Program Support (2023-Present)\n- Navy Cybersecurity Infrastructure Upgrade (2024)\n- DHS Border Technology Assessment (2025)\n\n## Certifications\n- EDWOSB (In Progress)\n- WOSB (In Progress)\n- Maryland MBE (Submitted)\n\n## Contact\nShannon Gueringer, CEO\nshannon@govorentoe.com\nwww.govorentoe.com",
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-02-20T14:30:00Z",
    priority: "high",
    reviewStatus: "approved",
    category: "govcon",
  },
  {
    id: "doc-2",
    title: "DHS Border Tech Capture Plan",
    type: "proposal",
    agent: "Bertha",
    agentEmoji: "\u{1F4BC}",
    status: "draft",
    content: "# DHS Border Tech Capture Plan\n\n## Opportunity Overview\n**Agency:** Department of Homeland Security\n**Solicitation:** DHS-2026-BT-001\n**Set-Aside:** WOSB\n**Value:** $2.5M - $5M\n\n## Capture Strategy\n1. Partner with established prime contractor\n2. Leverage Navy cybersecurity past performance\n3. Highlight AI/ML capabilities for threat detection\n4. Emphasize WOSB certification\n\n## Key Discriminators\n- AI-driven analytics platform\n- Real-time threat monitoring\n- Low-code rapid prototyping\n- Veterans on team\n\n## Next Steps\n- Schedule teaming call with potential prime (March 15)\n- Draft technical approach (March 20)\n- Complete capability briefing (March 25)",
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-03T16:45:00Z",
    priority: "critical",
    reviewStatus: "pending_review",
    category: "govcon",
    linkedTo: [{ type: "deal", id: "opp-dhs-border", name: "DHS Border Technology Modernization" }],
  },
  {
    id: "doc-3",
    title: "CPARS Self-Assessment FY2025",
    type: "report",
    agent: "Skylar",
    agentEmoji: "\u{1F324}\u{FE0F}",
    status: "in_review",
    content: "# CPARS Self-Assessment FY2025\n\n## Contract Performance Assessment\n\n**Contract:** SEAS IT Support\n**Prime:** Skyward IT Solutions\n**Period:** FY2025\n\n## Performance Ratings\n\n### Quality of Work: Exceptional\n- Zero critical defects\n- 98% first-time acceptance rate\n- Proactive issue identification\n\n### Timeliness: Very Good\n- All milestones met or exceeded\n- Average delivery 3 days ahead of schedule\n\n### Cost Control: Satisfactory\n- Within budget constraints\n- Some overruns on scope changes\n\n### Customer Satisfaction: Exceptional\n- Positive feedback from CMS stakeholders\n- Responsive communication\n- Strong partnership approach\n\n## Recommendations\nContinue current performance trajectory. Address cost control processes for scope changes.",
    createdAt: "2026-02-10T08:00:00Z",
    updatedAt: "2026-03-02T11:20:00Z",
    priority: "medium",
    reviewStatus: "pending_review",
    category: "compliance",
  },
  {
    id: "doc-4",
    title: "Maryland MBE Application Notes",
    type: "certification_doc",
    agent: "Veronica",
    agentEmoji: "\u{1F3AF}",
    status: "draft",
    content: "# Maryland MBE Application Notes\n\n## Submission Checklist\n- [x] Articles of Organization\n- [x] Operating Agreement\n- [x] Tax Returns (3 years)\n- [ ] Section 4 Form (Economic Disadvantage Certification)\n- [ ] Navy Fed Signature Card\n\n## Outstanding Items\n1. **Section 4 Form** - Needs personal financial statement from Shannon\n2. **Bank Signature Card** - Request from Navy Federal (est. 5 business days)\n\n## Submission Deadline\n**March 7, 2026** (CRITICAL)\n\n## Follow-Up Actions\n- Call MDOT certification office to confirm received docs (March 8)\n- Schedule interview if required\n- Track decision timeline (typically 60-90 days)\n\n## Notes\nApplication submitted via MDOT portal. Confirmation email received Feb 15, 2026.",
    createdAt: "2026-02-15T14:00:00Z",
    updatedAt: "2026-03-04T09:00:00Z",
    priority: "critical",
    reviewStatus: "pending_review",
    category: "compliance",
    linkedTo: [{ type: "certification", id: "md-mbe", name: "Maryland MBE" }],
  },
  {
    id: "doc-5",
    title: "Navy Cybersecurity Past Performance",
    type: "proposal",
    agent: "Bertha",
    agentEmoji: "\u{1F4BC}",
    status: "in_review",
    content: "# Navy Cybersecurity Infrastructure Upgrade - Past Performance\n\n## Contract Details\n**Client:** U.S. Navy\n**Contract:** N00178-24-C-1234\n**Period:** Jan 2024 - Dec 2024\n**Value:** $1.2M\n**Type:** Subcontractor (Prime: Northrop Grumman)\n\n## Scope of Work\nCybersecurity infrastructure upgrade for naval base network systems:\n- Network segmentation and isolation\n- Intrusion detection system deployment\n- Security operations center (SOC) setup\n- Personnel training and knowledge transfer\n\n## Performance Highlights\n- **On-Time Delivery:** 100% of milestones met\n- **Quality:** Zero security incidents post-deployment\n- **Innovation:** Implemented AI-driven threat detection (not in original SOW)\n- **Cost Savings:** Delivered 8% under budget\n\n## Client Feedback\n\"Vorentoe's team demonstrated exceptional technical expertise and professionalism. Their proactive approach to threat detection exceeded our expectations.\"\n-- LCDR James Mitchell, Navy Cyber Command\n\n## Relevance to Current Opportunity\nDirectly applicable to DHS border technology requirements for:\n- Real-time threat monitoring\n- AI/ML-driven analytics\n- Secure infrastructure design\n- Government facility clearance experience",
    createdAt: "2026-02-28T10:30:00Z",
    updatedAt: "2026-03-04T13:15:00Z",
    priority: "high",
    reviewStatus: "pending_review",
    category: "govcon",
    linkedTo: [{ type: "deal", id: "opp-navy-cyber", name: "Navy Cybersecurity Operations" }],
  },
];
