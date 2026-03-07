"use client";

import type { Document, DocumentStatus, DocumentType, DocumentPriority, ReviewStatus, LinkedItem } from "@/lib/mock-docs";
import { linkTypeConfig } from "@/components/docs/LinkPicker";
import { priorityStyles, reviewStatusStyles, categoryStyles } from "@/lib/ui-config";
import { PRIORITY_OPTIONS, REVIEW_STATUS_OPTIONS, CATEGORY_OPTIONS } from "@/lib/mock-docs";
import { getRelativeTime, getWordCount } from "@/lib/utils/formatting";

interface DocCardProps {
  document: Document;
  onClick: () => void;
}

const statusConfig: Record<
  DocumentStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  draft: {
    label: "Draft",
    color: "text-gray-400",
    bg: "bg-gray-500/10",
    border: "border-gray-500/30",
  },
  in_review: {
    label: "In Review",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  approved: {
    label: "Approved",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  exported: {
    label: "Exported",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
};

const typeConfig: Record<
  DocumentType,
  { label: string; color: string; bg: string }
> = {
  proposal: {
    label: "Proposal",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  capability_statement: {
    label: "Capability Statement",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  certification_doc: {
    label: "Certification Doc",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  report: {
    label: "Report",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  template: {
    label: "Template",
    color: "text-gray-400",
    bg: "bg-gray-500/10",
  },
};

export default function DocCard({ document, onClick }: DocCardProps) {
  const statusCfg =
    (document.status && statusConfig[document.status as DocumentStatus]) ??
    statusConfig.draft;
  const typeCfg =
    (document.type && typeConfig[document.type as DocumentType]) ??
    typeConfig.report;
  const pStyle = priorityStyles[document.priority || "medium"];
  const rStyle = reviewStatusStyles[document.reviewStatus || "pending_review"];
  const catStyle = categoryStyles[document.category || "uncategorized"] || categoryStyles.uncategorized;
  const catLabel = CATEGORY_OPTIONS.find((o) => o.value === document.category)?.label;

  return (
    <div
      onClick={onClick}
      className={`bg-gray-900 border rounded-lg p-4 hover:border-gray-700 transition-colors cursor-pointer ${
        document.reviewStatus === "pending_review" ? "border-amber-500/20" : "border-gray-800"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 pr-2 min-w-0">
          {/* Priority dot */}
          <div className={`w-2 h-2 rounded-full shrink-0 ${pStyle.dot}`} />
          <h3 className="text-sm font-bold text-gray-100 truncate">
            {document.title}
          </h3>
        </div>
        <span
          className={`${statusCfg.bg} ${statusCfg.border} ${statusCfg.color} border px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap`}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Type + Category + Review badges row */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {typeCfg && (
          <span className={`${typeCfg.bg} ${typeCfg.color} px-2 py-0.5 rounded text-[11px] font-medium`}>
            {typeCfg.label}
          </span>
        )}
        {catLabel && (
          <span className={`${catStyle} px-1.5 py-0.5 rounded text-[11px] font-mono`}>
            {catLabel}
          </span>
        )}
        {document.reviewStatus && document.reviewStatus !== "approved" && (
          <span className={`${rStyle.bg} ${rStyle.color} ${rStyle.border} border px-1.5 py-0.5 rounded text-[11px] font-medium`}>
            {REVIEW_STATUS_OPTIONS.find((o) => o.value === document.reviewStatus)?.label}
          </span>
        )}
        {document.assignments && document.assignments.length > 0 && (
          <span className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded text-[11px] font-medium">
            {document.assignments.length} assignment{document.assignments.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Linked Items */}
      {document.linkedTo && document.linkedTo.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {document.linkedTo.slice(0, 3).map((item: LinkedItem) => {
            const cfg = linkTypeConfig[item.type];
            return (
              <span
                key={`${item.type}-${item.id}`}
                className={`${cfg.bg} ${cfg.color} px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[140px]`}
              >
                {item.name}
              </span>
            );
          })}
          {document.linkedTo.length > 3 && (
            <span className="text-[10px] text-gray-500">+{document.linkedTo.length - 3}</span>
          )}
        </div>
      )}

      {/* Content Preview */}
      <p className="text-xs text-gray-400 mb-3 line-clamp-2">
        {(document.content || "").slice(0, 120)}
        {(document.content || "").length > 120 ? "..." : ""}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-gray-500">
          <span className="text-base">{document.agentEmoji}</span>
          <span>{document.agent}</span>
          {document.notes && document.notes.length > 0 && (
            <span className="text-blue-400/60">{document.notes.length} note{document.notes.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-gray-500 font-mono">
          <span>{getWordCount(document.content || "")} words</span>
          <span>{getRelativeTime(document.updatedAt || document.createdAt || "")}</span>
        </div>
      </div>
    </div>
  );
}
