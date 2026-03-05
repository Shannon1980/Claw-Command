export type CertStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "APPROVED"
  | "EXPIRING"
  | "EXPIRED";

export type CertLevel = "Federal" | "State" | "Local";

export interface Document {
  name: string;
  completed: boolean;
}

export interface Certification {
  id: string;
  name: string;
  level: CertLevel;
  authority: string;
  status: CertStatus;
  dueDate?: string; // ISO date string
  appliedDate?: string;
  decisionExpected?: string;
  expiresDate?: string;
  documents: Document[];
  description?: string;
  notes?: string;
}

export const mockCertifications: Certification[] = [
  {
    id: "8a",
    name: "8(a) Program",
    level: "Federal",
    authority: "SBA",
    status: "NOT_STARTED",
    description: "Needs eligibility verification",
    documents: [
      { name: "Personal Financial Statement", completed: false },
      { name: "Tax Returns (3 years)", completed: false },
      { name: "Business Plan", completed: false },
      { name: "Proof of Disadvantage", completed: false },
      { name: "SBA Form 413", completed: false },
    ],
  },
  {
    id: "edwosb",
    name: "EDWOSB",
    level: "Federal",
    authority: "SBA",
    status: "NOT_STARTED",
    documents: [
      { name: "SAM.gov Registration", completed: false },
      { name: "WOSB Certification", completed: false },
      { name: "Economic Disadvantage Proof", completed: false },
      { name: "Business License", completed: false },
    ],
  },
  {
    id: "wosb",
    name: "WOSB",
    level: "Federal",
    authority: "SBA",
    status: "IN_PROGRESS",
    documents: [
      { name: "SAM.gov Registration", completed: true },
      { name: "Business Plan", completed: true },
      { name: "Tax Returns", completed: true },
      { name: "Financial Statements", completed: false },
      { name: "Ownership Documents", completed: false },
    ],
  },
  {
    id: "md-mbe",
    name: "Maryland MBE",
    level: "State",
    authority: "MDOT",
    status: "SUBMITTED",
    dueDate: "2026-03-07",
    appliedDate: "2026-02-15",
    decisionExpected: "2026-04-15",
    documents: [
      { name: "Articles of Organization", completed: true },
      { name: "Operating Agreement", completed: true },
      { name: "Tax Returns", completed: true },
      { name: "Section 4 Form", completed: false },
      { name: "Navy Fed Signature Card", completed: false },
    ],
  },
  {
    id: "lsbrp",
    name: "LSBRP Montgomery County",
    level: "Local",
    authority: "MoCo",
    status: "NOT_STARTED",
    documents: [
      { name: "Vendor Registration", completed: false },
      { name: "Business License", completed: false },
    ],
  },
];

export function getCertificationHealth(
  certs: Certification[] = mockCertifications
): {
  total: number;
  onTrack: number;
  atRisk: number;
  critical: number;
} {
  let onTrack = 0;
  let atRisk = 0;
  let critical = 0;

  certs.forEach((cert) => {
    if (cert.status === "APPROVED") {
      onTrack++;
    } else if (cert.status === "EXPIRED" || cert.status === "EXPIRING") {
      critical++;
    } else if (cert.dueDate) {
      const daysUntilDue = Math.ceil(
        (new Date(cert.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDue < 3) {
        critical++;
      } else if (daysUntilDue < 14) {
        atRisk++;
      } else {
        onTrack++;
      }
    } else {
      onTrack++;
    }
  });

  return {
    total: certs.length,
    onTrack,
    atRisk,
    critical,
  };
}
