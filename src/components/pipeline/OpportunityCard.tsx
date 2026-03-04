"use client";

import { Opportunity, formatUsd } from "@/lib/mock-pipeline";

function ApprovalBadge({ approval }: { approval: boolean | null }) {
  if (approval === true)
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
        ✅ Approved
      </span>
    );
  if (approval === false)
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
        ❌ Rejected
      </span>
    );
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
      ⏳ Pending
    </span>
  );
}

export default function OpportunityCard({ opp }: { opp: Opportunity }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", opp.id)}
      className="bg-gray-900/80 border border-gray-800 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-gray-600 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-gray-200 leading-tight">
          {opp.title}
        </h4>
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

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {opp.ownerEmoji} {opp.ownerAgent}
        </span>
        <ApprovalBadge approval={opp.shannonApproval} />
      </div>
    </div>
  );
}
