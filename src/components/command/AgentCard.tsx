"use client";

import { Agent, DOMAIN_COLORS, STATUS_CONFIG } from "@/lib/mock-data";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AgentCard({ agent }: { agent: Agent }) {
  const status = STATUS_CONFIG[agent.status];
  const domainStyle = DOMAIN_COLORS[agent.domain];

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{agent.emoji}</span>
          <span className="font-semibold text-gray-100">{agent.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${domainStyle}`}
          >
            {agent.domain}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          {status.pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.color} opacity-75`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status.color}`}
          />
        </span>
        <span className="text-sm text-gray-400">{status.label}</span>
      </div>

      {/* Current Task */}
      {agent.currentTask ? (
        <p className="text-sm text-gray-300 bg-gray-800/50 rounded px-2 py-1.5 font-mono text-xs leading-relaxed">
          {agent.currentTask}
        </p>
      ) : (
        <p className="text-sm text-gray-600 italic">No active task</p>
      )}

      {/* Footer */}
      <div className="mt-3 text-xs text-gray-600">
        Updated {timeAgo(agent.updatedAt)}
      </div>
    </div>
  );
}
