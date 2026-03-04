import React from "react";
import { Priority } from "@/lib/mock-brief";

interface PriorityListProps {
  priorities: Priority[];
}

const urgencyConfig = {
  critical: {
    bg: "bg-red-900/20",
    border: "border-red-500",
    text: "text-red-400",
    label: "CRITICAL",
  },
  high: {
    bg: "bg-orange-900/20",
    border: "border-orange-500",
    text: "text-orange-400",
    label: "HIGH",
  },
  medium: {
    bg: "bg-yellow-900/20",
    border: "border-yellow-500",
    text: "text-yellow-400",
    label: "MEDIUM",
  },
};

export default function PriorityList({ priorities }: PriorityListProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
        <span>⚡</span> What needs your attention today
      </h2>
      <div className="space-y-3">
        {priorities.map((priority, idx) => {
          const config = urgencyConfig[priority.urgency];
          return (
            <div
              key={priority.id}
              className={`${config.bg} border-l-4 ${config.border} rounded p-4 hover:bg-opacity-30 transition-colors`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${config.text}`}>
                      {idx + 1}. {config.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {priority.domain}
                    </span>
                  </div>
                  <p className="text-gray-200 font-medium">{priority.title}</p>
                  {priority.dueDate && (
                    <p className="text-xs text-gray-400 mt-1">
                      Due: {new Date(priority.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
