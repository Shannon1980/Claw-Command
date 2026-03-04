"use client";

import React, { useState } from "react";
import { Workstream, WorkstreamStatus } from "@/lib/mock-workstreams";
import MilestoneTimeline from "./MilestoneTimeline";

interface WorkstreamCardProps {
  workstream: Workstream;
}

const statusConfig: Record<
  WorkstreamStatus,
  { bg: string; border: string; text: string; icon: string; label: string }
> = {
  on_track: {
    bg: "bg-green-900/20",
    border: "border-green-500",
    text: "text-green-400",
    icon: "✓",
    label: "ON TRACK",
  },
  at_risk: {
    bg: "bg-amber-900/20",
    border: "border-amber-500",
    text: "text-amber-400",
    icon: "⚠",
    label: "AT RISK",
  },
  blocked: {
    bg: "bg-red-900/20",
    border: "border-red-500",
    text: "text-red-400",
    icon: "🚫",
    label: "BLOCKED",
  },
};

export default function WorkstreamCard({ workstream }: WorkstreamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = statusConfig[workstream.status];

  const completedMilestones = workstream.milestones.filter(
    (m) => m.completed
  ).length;
  const totalMilestones = workstream.milestones.length;
  const progress = Math.round((completedMilestones / totalMilestones) * 100);

  return (
    <div
      className={`${config.bg} border-l-4 ${config.border} rounded-lg overflow-hidden`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-bold ${config.text}`}>
                {config.icon} {config.label}
              </span>
              <span className="text-xs text-gray-500">
                {completedMilestones}/{totalMilestones} milestones
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-100 mb-1">
              {workstream.name}
            </h3>
            <p className="text-sm text-gray-400">{workstream.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 bg-gray-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    workstream.status === "on_track"
                      ? "bg-green-500"
                      : workstream.status === "at_risk"
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{progress}%</span>
            </div>
          </div>
          <span className="text-gray-400 text-xl">
            {isExpanded ? "−" : "+"}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">
              Timeline
            </h4>
            <MilestoneTimeline milestones={workstream.milestones} />
          </div>

          {workstream.riskFactors && workstream.riskFactors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-400 mb-2">
                Risk Factors
              </h4>
              <ul className="space-y-1">
                {workstream.riskFactors.map((risk, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-gray-300 pl-6 before:content-['•'] before:absolute before:left-2"
                    style={{ position: "relative" }}
                  >
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 border-t border-gray-800">
            <span className="text-xs text-gray-500">
              Owner: {workstream.owner}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
