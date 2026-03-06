"use client";

import { useState } from "react";
import { useMCBlockers } from "../hooks/useMCData";

const BASE = "/api/mission-control";

export default function MC_Dependencies() {
  const { blockers, loading, refresh } = useMCBlockers();
  const [resolving, setResolving] = useState<string | null>(null);

  const handleResolve = async (id: string) => {
    setResolving(id);
    try {
      const res = await fetch(`${BASE}/blockers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      if (res.ok) await refresh();
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="mc-panel p-4">
      <h2 className="mc-panel-header text-sm font-semibold text-gray-300 mb-4">
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
                className="mc-card flex items-center justify-between gap-2 text-sm text-gray-300 p-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      b.status === "open" ? "bg-amber-500" : "bg-green-500"
                    }`}
                  />
                  <span className="truncate">{b.title}</span>
                  <span className="text-xs text-gray-500 shrink-0">({b.type})</span>
                </div>
                {b.status === "open" && (
                  <button
                    onClick={() => handleResolve(b.id)}
                    disabled={resolving === b.id}
                    className="shrink-0 px-2 py-0.5 text-xs font-medium rounded bg-green-600/80 text-white hover:bg-green-600 disabled:opacity-50"
                  >
                    {resolving === b.id ? "…" : "Resolve"}
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
