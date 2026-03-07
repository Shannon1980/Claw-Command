"use client";

import type {
  Document,
  DocumentPriority,
  ReviewStatus,
  DocumentCategory,
} from "@/lib/mock-docs";
import { PRIORITY_OPTIONS, REVIEW_STATUS_OPTIONS, CATEGORY_OPTIONS } from "@/lib/mock-docs";

interface ReviewQueueProps {
  documents: Document[];
  onSelect: (doc: Document) => void;
  onReviewAction: (docId: string, action: ReviewStatus) => void;
}

const priorityOrder: Record<DocumentPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityStyles: Record<DocumentPriority, { bg: string; border: string; color: string; dot: string }> = {
  critical: { bg: "bg-red-500/10", border: "border-red-500/30", color: "text-red-400", dot: "bg-red-400" },
  high: { bg: "bg-orange-500/10", border: "border-orange-500/30", color: "text-orange-400", dot: "bg-orange-400" },
  medium: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", color: "text-yellow-400", dot: "bg-yellow-400" },
  low: { bg: "bg-gray-500/10", border: "border-gray-500/30", color: "text-gray-400", dot: "bg-gray-500" },
};

const reviewStatusStyles: Record<ReviewStatus, { bg: string; color: string; border: string }> = {
  pending_review: { bg: "bg-amber-500/10", color: "text-amber-400", border: "border-amber-500/30" },
  reviewed: { bg: "bg-blue-500/10", color: "text-blue-400", border: "border-blue-500/30" },
  needs_changes: { bg: "bg-orange-500/10", color: "text-orange-400", border: "border-orange-500/30" },
  approved: { bg: "bg-green-500/10", color: "text-green-400", border: "border-green-500/30" },
  rejected: { bg: "bg-red-500/10", color: "text-red-400", border: "border-red-500/30" },
};

const categoryStyles: Record<string, string> = {
  govcon: "text-cyan-400 bg-cyan-500/10",
  internal: "text-gray-400 bg-gray-500/10",
  compliance: "text-amber-400 bg-amber-500/10",
  financial: "text-green-400 bg-green-500/10",
  technical: "text-blue-400 bg-blue-500/10",
  hr: "text-pink-400 bg-pink-500/10",
  marketing: "text-purple-400 bg-purple-500/10",
  legal: "text-red-400 bg-red-500/10",
  uncategorized: "text-gray-500 bg-gray-500/10",
};

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (!Number.isFinite(diffInSeconds) || diffInSeconds < 0) return "";
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function ReviewQueue({ documents, onSelect, onReviewAction }: ReviewQueueProps) {
  // Sort: pending_review first, then by priority, then by date
  const sorted = [...documents].sort((a, b) => {
    // pending_review always comes first
    const aIsPending = a.reviewStatus === "pending_review" ? 0 : 1;
    const bIsPending = b.reviewStatus === "pending_review" ? 0 : 1;
    if (aIsPending !== bIsPending) return aIsPending - bIsPending;

    const aPrio = priorityOrder[a.priority || "medium"];
    const bPrio = priorityOrder[b.priority || "medium"];
    if (aPrio !== bPrio) return aPrio - bPrio;

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const pendingCount = documents.filter((d) => d.reviewStatus === "pending_review").length;

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">&#9989;</div>
        <p className="text-gray-500 text-sm">Review queue is empty</p>
        <p className="text-gray-600 text-xs mt-1">New documents will appear here for review</p>
      </div>
    );
  }

  return (
    <div>
      {/* Queue header stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">Pending:</span>
          <span className={`text-xs font-bold ${pendingCount > 0 ? "text-amber-400" : "text-green-400"}`}>
            {pendingCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">Total in queue:</span>
          <span className="text-xs font-bold text-gray-300">{sorted.length}</span>
        </div>
      </div>

      {/* Queue items */}
      <div className="space-y-2">
        {sorted.map((doc) => {
          const pStyle = priorityStyles[doc.priority || "medium"];
          const rStyle = reviewStatusStyles[doc.reviewStatus || "pending_review"];
          const reviewLabel = REVIEW_STATUS_OPTIONS.find((o) => o.value === doc.reviewStatus)?.label || "Pending Review";
          const catStyle = categoryStyles[doc.category || "uncategorized"] || categoryStyles.uncategorized;
          const catLabel = CATEGORY_OPTIONS.find((o) => o.value === doc.category)?.label || "Uncategorized";

          return (
            <div
              key={doc.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:border-gray-600 ${
                doc.reviewStatus === "pending_review"
                  ? "bg-gray-900/80 border-amber-500/20"
                  : "bg-gray-900/40 border-gray-800"
              }`}
              onClick={() => onSelect(doc)}
            >
              {/* Priority dot */}
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${pStyle.dot}`} />

              {/* Doc info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-gray-100 truncate">{doc.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-gray-500">{doc.agentEmoji} {doc.agent}</span>
                  <span className={`px-1.5 py-0.5 rounded ${catStyle} font-mono`}>{catLabel}</span>
                  <span className="text-gray-600">{getRelativeTime(doc.updatedAt)}</span>
                </div>
              </div>

              {/* Priority badge */}
              <span className={`${pStyle.bg} ${pStyle.color} ${pStyle.border} border px-2 py-0.5 rounded text-[11px] font-medium shrink-0`}>
                {PRIORITY_OPTIONS.find((o) => o.value === doc.priority)?.label || "Medium"}
              </span>

              {/* Review status badge */}
              <span className={`${rStyle.bg} ${rStyle.color} ${rStyle.border} border px-2 py-0.5 rounded text-[11px] font-medium shrink-0`}>
                {reviewLabel}
              </span>

              {/* Quick actions */}
              {doc.reviewStatus === "pending_review" && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onReviewAction(doc.id, "approved"); }}
                    className="px-2 py-1 text-[11px] font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors"
                    title="Approve"
                  >
                    Approve
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onReviewAction(doc.id, "needs_changes"); }}
                    className="px-2 py-1 text-[11px] font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded hover:bg-orange-500/30 transition-colors"
                    title="Needs Changes"
                  >
                    Changes
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onReviewAction(doc.id, "rejected"); }}
                    className="px-2 py-1 text-[11px] font-medium bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
                    title="Reject"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { priorityStyles, reviewStatusStyles, categoryStyles };
