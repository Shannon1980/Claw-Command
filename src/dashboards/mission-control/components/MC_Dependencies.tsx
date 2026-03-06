"use client";

import { useMCBlockers } from "../hooks/useMCData";

export default function MC_Dependencies() {
  const { blockers, loading } = useMCBlockers();

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-4">
        Blockers & Dependencies
      </h2>
      {loading ? (
        <div className="h-24 animate-pulse bg-gray-800/50 rounded" />
      ) : (
        <ul className="space-y-2">
          {blockers.length === 0 ? (
            <li className="text-sm text-gray-500 italic">No blockers</li>
          ) : (
            blockers.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-2 text-sm text-gray-300 bg-gray-800/30 rounded p-2"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    b.status === "open" ? "bg-amber-500" : "bg-green-500"
                  }`}
                />
                {b.title}
                <span className="text-xs text-gray-500">({b.type})</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
