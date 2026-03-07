"use client";

import { Document, DocumentStatus, DocumentType, LinkedItem } from "@/lib/mock-docs";
import { linkTypeConfig } from "@/components/docs/LinkPicker";

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

function getWordCount(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (!Number.isFinite(diffInSeconds) || diffInSeconds < 0) return "";
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function DocCard({ document, onClick }: DocCardProps) {
  const statusCfg =
    (document.status && statusConfig[document.status as DocumentStatus]) ??
    statusConfig.draft;
  const typeCfg =
    (document.type && typeConfig[document.type as DocumentType]) ??
    typeConfig.report;

  return (
    <div
      onClick={onClick}
      className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-100 flex-1 pr-2">
          {document.title}
        </h3>
        <span
          className={`${statusCfg.bg} ${statusCfg.border} ${statusCfg.color} border px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap`}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Type Badge */}
      <div className="mb-3">
        {typeCfg && (
          <span
            className={`${typeCfg.bg} ${typeCfg.color} px-2 py-0.5 rounded text-xs font-medium`}
          >
            {typeCfg.label}
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

      {/* Linked items */}
      {((document as Document & { linkedTo?: LinkedItem[] }).linkedTo || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {((document as Document & { linkedTo?: LinkedItem[] }).linkedTo || []).map((link: LinkedItem, i: number) => (
            <span
              key={`${link.type}-${link.id}-${i}`}
              className={`px-1.5 py-0.5 rounded text-[10px] ${linkTypeColors[link.type] || "bg-gray-500/10 text-gray-400"}`}
            >
              {link.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-gray-500">
          <span className="text-base">{document.agentEmoji}</span>
          <span>{document.agent}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500 font-mono">
          <span>{(document.content || "").trim().split(/\s+/).filter(Boolean).length} words</span>
        <div className="flex items-center gap-3 text-gray-500 font-mono">
          <span>{getWordCount(document.content || "")} words</span>
          <span>{getRelativeTime(document.updatedAt || document.createdAt || "")}</span>
        </div>
      </div>
    </div>
  );
}
