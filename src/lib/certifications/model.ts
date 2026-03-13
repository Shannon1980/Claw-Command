export const CERT_LEVELS = ["Federal", "State", "Local"] as const;
export type CertLevel = (typeof CERT_LEVELS)[number];

export const CERT_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "APPROVED",
  "EXPIRING",
  "EXPIRED",
] as const;
export type CertStatus = (typeof CERT_STATUSES)[number];

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
  dueDate?: string;
  appliedDate?: string;
  decisionExpected?: string;
  expiresDate?: string;
  documents: CertDocument[];
  description?: string;
  notes?: string;
}

export interface CertificationsApiMeta {
  lastUpdated: string;
  source: "database";
}

export interface CertificationsApiResponse {
  data: Certification[];
  meta: CertificationsApiMeta;
}

export function isCertStatus(value: unknown): value is CertStatus {
  return typeof value === "string" && (CERT_STATUSES as readonly string[]).includes(value);
}

export function isCertLevel(value: unknown): value is CertLevel {
  return typeof value === "string" && (CERT_LEVELS as readonly string[]).includes(value);
}

export function toCertDocument(input: unknown): CertDocument | null {
  if (!input || typeof input !== "object") return null;
  const item = input as Record<string, unknown>;
  if (typeof item.name !== "string") return null;
  return {
    name: item.name,
    completed: Boolean(item.completed),
  };
}

export function toCertification(input: unknown): Certification | null {
  if (!input || typeof input !== "object") return null;

  const value = input as Record<string, unknown>;
  if (typeof value.id !== "string" || typeof value.name !== "string") return null;

  const documents = Array.isArray(value.documents)
    ? value.documents.map(toCertDocument).filter((doc): doc is CertDocument => !!doc)
    : [];

  return {
    id: value.id,
    name: value.name,
    level: isCertLevel(value.level) ? value.level : "Federal",
    authority: typeof value.authority === "string" ? value.authority : "",
    status: isCertStatus(value.status) ? value.status : "NOT_STARTED",
    dueDate: typeof value.dueDate === "string" ? value.dueDate : undefined,
    appliedDate: typeof value.appliedDate === "string" ? value.appliedDate : undefined,
    decisionExpected:
      typeof value.decisionExpected === "string" ? value.decisionExpected : undefined,
    expiresDate: typeof value.expiresDate === "string" ? value.expiresDate : undefined,
    description: typeof value.description === "string" ? value.description : undefined,
    notes: typeof value.notes === "string" ? value.notes : undefined,
    documents,
  };
}

export function parseCertificationsApiResponse(payload: unknown): CertificationsApiResponse {
  if (Array.isArray(payload)) {
    return {
      data: payload.map(toCertification).filter((item): item is Certification => !!item),
      meta: {
        lastUpdated: new Date().toISOString(),
        source: "database",
      },
    };
  }

  if (!payload || typeof payload !== "object") {
    return {
      data: [],
      meta: {
        lastUpdated: new Date().toISOString(),
        source: "database",
      },
    };
  }

  const record = payload as Record<string, unknown>;
  const data = Array.isArray(record.data)
    ? record.data.map(toCertification).filter((item): item is Certification => !!item)
    : [];

  const metaRecord =
    record.meta && typeof record.meta === "object"
      ? (record.meta as Record<string, unknown>)
      : null;

  return {
    data,
    meta: {
      lastUpdated:
        metaRecord && typeof metaRecord.lastUpdated === "string"
          ? metaRecord.lastUpdated
          : new Date().toISOString(),
      source: "database",
    },
  };
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
