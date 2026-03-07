"use client";

import type {
  Document,
  DocumentPriority,
  ReviewStatus,
  DocumentCategory,
} from "@/lib/mock-docs";
import { PRIORITY_OPTIONS, REVIEW_STATUS_OPTIONS, CATEGORY_OPTIONS } from "@/lib/mock-docs";
import { priorityStyles, reviewStatusStyles, categoryStyles } from "@/lib/ui-config";
import { getRelativeTime } from "@/lib/utils/formatting";

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

