export type CertStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "APPROVED"
  | "EXPIRING"
  | "EXPIRED";

export type CertLevel = "Federal" | "State" | "Local";

export interface CertDocument {
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
  documents: CertDocument[];
  description?: string;
  notes?: string;
}

export function getCertificationHealth(
  certs: Certification[]
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
