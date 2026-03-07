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


