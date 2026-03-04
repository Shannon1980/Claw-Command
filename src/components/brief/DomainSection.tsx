"use client";

import React, { useState } from "react";
import { DomainStatus } from "@/lib/mock-brief";

interface DomainSectionProps {
  domain: DomainStatus;
}

export default function DomainSection({ domain }: DomainSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{domain.icon}</span>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-100">
              {domain.name}
            </h3>
            <p className="text-sm text-gray-400">
              {domain.activeTasks} active tasks
            </p>
          </div>
        </div>
        <span className="text-gray-400 text-xl">
          {isExpanded ? "−" : "+"}
        </span>
      </button>

      {isExpanded && (
        <div className="px-6 pb-4 space-y-4">
          {domain.blockers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                <span>🚫</span> Blockers
              </h4>
              <ul className="space-y-1">
                {domain.blockers.map((blocker, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-gray-300 pl-6 before:content-['•'] before:absolute before:left-2"
                    style={{ position: "relative" }}
                  >
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {domain.keyUpdates.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                <span>📌</span> Key Updates
              </h4>
              <ul className="space-y-1">
                {domain.keyUpdates.map((update, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-gray-300 pl-6 before:content-['•'] before:absolute before:left-2"
                    style={{ position: "relative" }}
                  >
                    {update}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
