"use client";

import { Application } from "@/lib/mock-pipeline";
import ApprovalBadge from "@/components/shared/ApprovalBadge";

export default function ApplicationCard({ app }: { app: Application }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", app.id)}
      className="bg-gray-900/80 border border-gray-800 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-gray-600 transition-all"
    >
      <h4 className="text-sm font-medium text-gray-200 leading-tight mb-1">
        {app.title}
      </h4>

      <p className="text-xs text-gray-500 line-clamp-2 mb-3">
        {app.description}
      </p>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">
          {app.ownerEmoji} {app.ownerAgent}
        </span>
        {app.dependenciesCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
            {app.dependenciesCount} deps
          </span>
        )}
      </div>

      <ApprovalBadge approval={app.shannonApproval} />
    </div>
  );
}
