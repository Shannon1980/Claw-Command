"use client";

import { Opportunity, formatUsd, SOURCE_LABELS } from "@/lib/mock-pipeline";
import ApprovalBadge from "@/components/shared/ApprovalBadge";

export default function OpportunityCard({ opp }: { opp: Opportunity }) {
  const sourceMeta = SOURCE_LABELS[opp.source] || SOURCE_LABELS.manual;

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", opp.id)}
      className="bg-gray-900/80 border border-gray-800 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-gray-600 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="text-sm font-medium text-gray-200 leading-tight">
          {opp.sourceUrl ? (
            <a
              href={opp.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {opp.title}
            </a>
          ) : (
            opp.title
          )}
        </h4>
      </div>

      {/* Source Badge */}
      <div className="mb-2">
        <span
          className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border ${sourceMeta.color}`}
        >
          {sourceMeta.label}
        </span>
        {opp.agency && (
          <span className="text-[10px] text-gray-500 ml-1.5 truncate">
            {opp.agency}
          </span>
        )}
      </div>

      <div className="text-xl font-bold text-cyan-400 font-mono mb-2">
        {formatUsd(opp.valueUsd)}
      </div>

      {/* Probability Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
          <span>Probability</span>
          <span className="font-mono">{opp.probability}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
            style={{ width: `${opp.probability}%` }}
          />
        </div>
      </div>

      {/* Deadline */}
      {opp.deadline && (
        <div className="text-[10px] text-gray-500 font-mono mb-2">
          Due: {new Date(opp.deadline).toLocaleDateString()}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {opp.ownerEmoji} {opp.ownerAgent}
        </span>
        <ApprovalBadge approval={opp.shannonApproval} />
      </div>
    </div>
  );
}
