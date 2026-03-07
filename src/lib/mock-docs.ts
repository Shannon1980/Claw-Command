export type DocumentType =
  | "proposal"
  | "capability_statement"
  | "certification_doc"
  | "report"
  | "template";

export type DocumentStatus = "draft" | "in_review" | "approved" | "exported";

export interface LinkedItem {
  type: "deal" | "certification" | "task";
  id: string;
  name: string;
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
}

export const mockDocuments: Document[] = [
  {
    id: "doc-1",
    title: "Vorentoe Capability Statement v2",
    type: "capability_statement",
    agent: "Muse",
    agentEmoji: "🎨",
    status: "approved",
    content: `# Vorentoe LLC - Capability Statement

## Company Overview
Vorentoe LLC is an EDWOSB-certified technology consulting firm specializing in AI/ML solutions, IT program management, and government contracting services.

## Core Capabilities
- AI/ML Integration & Implementation
- IT Program Management
- Procurement Automation
- Low-Code Platform Development
- Cybersecurity Solutions

## Past Performance
- CMS SEAS IT Program Support (2023-Present)
- Navy Cybersecurity Infrastructure Upgrade (2024)
- DHS Border Technology Assessment (2025)

## Certifications
- EDWOSB (In Progress)
- WOSB (In Progress)
- Maryland MBE (Submitted)

## Contact
Shannon Gueringer, CEO
shannon@govorentoe.com
www.govorentoe.com`,
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-02-20T14:30:00Z",
  },
  {
    id: "doc-2",
    title: "DHS Border Tech Capture Plan",
    type: "proposal",
    agent: "Bertha",
    agentEmoji: "💼",
    status: "draft",
    content: `# DHS Border Tech Capture Plan

## Opportunity Overview
**Agency:** Department of Homeland Security
**Solicitation:** DHS-2026-BT-001
**Set-Aside:** WOSB
**Value:** $2.5M - $5M

## Capture Strategy
1. Partner with established prime contractor
2. Leverage Navy cybersecurity past performance
3. Highlight AI/ML capabilities for threat detection
4. Emphasize WOSB certification

## Key Discriminators
- AI-driven analytics platform
- Real-time threat monitoring
- Low-code rapid prototyping
- Veterans on team

## Next Steps
- Schedule teaming call with potential prime (March 15)
- Draft technical approach (March 20)
- Complete capability briefing (March 25)`,
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-03T16:45:00Z",
  },
  {
    id: "doc-3",
    title: "CPARS Self-Assessment FY2025",
    type: "report",
    agent: "Skylar",
    agentEmoji: "🌤️",
    status: "in_review",
    content: `# CPARS Self-Assessment FY2025

## Contract Performance Assessment

**Contract:** SEAS IT Support
**Prime:** Skyward IT Solutions
**Period:** FY2025

## Performance Ratings

### Quality of Work: Exceptional
- Zero critical defects
- 98% first-time acceptance rate
- Proactive issue identification

### Timeliness: Very Good
- All milestones met or exceeded
- Average delivery 3 days ahead of schedule

### Cost Control: Satisfactory
- Within budget constraints
- Some overruns on scope changes

### Customer Satisfaction: Exceptional
- Positive feedback from CMS stakeholders
- Responsive communication
- Strong partnership approach

## Recommendations
Continue current performance trajectory. Address cost control processes for scope changes.`,
    createdAt: "2026-02-10T08:00:00Z",
    updatedAt: "2026-03-02T11:20:00Z",
  },
  {
    id: "doc-4",
    title: "Maryland MBE Application Notes",
    type: "certification_doc",
    agent: "Veronica",
    agentEmoji: "🛡️",
    status: "draft",
    content: `# Maryland MBE Application Notes

## Submission Checklist
- [x] Articles of Organization
- [x] Operating Agreement
- [x] Tax Returns (3 years)
- [ ] Section 4 Form (Economic Disadvantage Certification)
- [ ] Navy Fed Signature Card

## Outstanding Items
1. **Section 4 Form** - Needs personal financial statement from Shannon
2. **Bank Signature Card** - Request from Navy Federal (est. 5 business days)

## Submission Deadline
**March 7, 2026** (CRITICAL)

## Follow-Up Actions
- Call MDOT certification office to confirm received docs (March 8)
- Schedule interview if required
- Track decision timeline (typically 60-90 days)

## Notes
Application submitted via MDOT portal. Confirmation email received Feb 15, 2026.`,
    createdAt: "2026-02-15T14:00:00Z",
    updatedAt: "2026-03-04T09:00:00Z",
  },
  {
    id: "doc-5",
    title: "Navy Cybersecurity Past Performance",
    type: "proposal",
    agent: "Bertha",
    agentEmoji: "💼",
    status: "in_review",
    content: `# Navy Cybersecurity Infrastructure Upgrade - Past Performance

## Contract Details
**Client:** U.S. Navy
**Contract:** N00178-24-C-1234
**Period:** Jan 2024 - Dec 2024
**Value:** $1.2M
**Type:** Subcontractor (Prime: Northrop Grumman)

## Scope of Work
Cybersecurity infrastructure upgrade for naval base network systems:
- Network segmentation and isolation
- Intrusion detection system deployment
- Security operations center (SOC) setup
- Personnel training and knowledge transfer

## Performance Highlights
- **On-Time Delivery:** 100% of milestones met
- **Quality:** Zero security incidents post-deployment
- **Innovation:** Implemented AI-driven threat detection (not in original SOW)
- **Cost Savings:** Delivered 8% under budget

## Client Feedback
"Vorentoe's team demonstrated exceptional technical expertise and professionalism. Their proactive approach to threat detection exceeded our expectations."
— LCDR James Mitchell, Navy Cyber Command

## Relevance to Current Opportunity
Directly applicable to DHS border technology requirements for:
- Real-time threat monitoring
- AI/ML-driven analytics
- Secure infrastructure design
- Government facility clearance experience`,
    createdAt: "2026-02-28T10:30:00Z",
    updatedAt: "2026-03-04T13:15:00Z",
  },
];

export function getDocumentsByType(type: DocumentType): Document[] {
  return mockDocuments.filter((doc) => doc.type === type);
}

export function getDocumentsByAgent(agent: string): Document[] {
  return mockDocuments.filter((doc) => doc.agent === agent);
}

export function getDocumentsByStatus(status: DocumentStatus): Document[] {
  return mockDocuments.filter((doc) => doc.status === status);
}
