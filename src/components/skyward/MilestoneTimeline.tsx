import React from "react";
import { Milestone } from "@/lib/mock-workstreams";

interface MilestoneTimelineProps {
  milestones: Milestone[];
}

export default function MilestoneTimeline({
  milestones,
}: MilestoneTimelineProps) {
  return (
    <div className="space-y-3">
      {milestones.map((milestone, idx) => {
        const isLast = idx === milestones.length - 1;
        const milestoneDate = new Date(milestone.date);
        const isPast = milestoneDate < new Date();
        const isOverdue = isPast && !milestone.completed;

        return (
          <div key={milestone.id} className="flex items-start gap-3">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full border-2 ${
                  milestone.completed
                    ? "bg-green-500 border-green-500"
                    : isOverdue
                    ? "bg-red-500 border-red-500"
                    : "bg-gray-800 border-gray-600"
                }`}
              >
                {milestone.completed && (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[8px] text-white font-bold">✓</span>
                  </div>
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 h-8 ${
                    milestone.completed ? "bg-green-500" : "bg-gray-700"
                  }`}
                />
              )}
            </div>

            {/* Milestone details */}
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between">
                <span
                  className={`font-medium ${
                    milestone.completed
                      ? "text-gray-300 line-through"
                      : isOverdue
                      ? "text-red-400"
                      : "text-gray-100"
                  }`}
                >
                  {milestone.name}
                </span>
                <span
                  className={`text-xs ${
                    isOverdue
                      ? "text-red-400 font-semibold"
                      : "text-gray-500"
                  }`}
                >
                  {milestoneDate.toLocaleDateString()}
                </span>
              </div>
              {isOverdue && (
                <span className="text-xs text-red-400">⚠️ Overdue</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
