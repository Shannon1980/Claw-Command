"use client";

import { useMemo } from "react";
import { useMCDecisions } from "../hooks/useMCData";

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved" || s === "implemented") return "text-green-300 bg-green-500/20";
  if (s === "rejected") return "text-red-300 bg-red-500/20";
  if (s === "proposed") return "text-blue-300 bg-blue-500/20";
  return "text-gray-300 bg-gray-600/30";
}

export default function MC_DecisionsPanel() {
  const { decisions, loading, refresh } = useMCDecisions();

  const counts = useMemo(() => {
    const base = { proposed: 0, approved: 0, implemented: 0, rejected: 0 };
    for (const d of decisions) {
      const k = (d.status || "").toLowerCase();
      if (k in base) {
        (base as Record<string, number>)[k] += 1;
      }
    }
    return base;
  }, [decisions]);

  return (
    <div className="mc-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="mc-panel-header text-sm font-semibold text-gray-300">Decisions</h2>
        <button
          onClick={refresh}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          type="button"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="h-24 animate-pulse bg-gray-800/50 rounded" />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="rounded bg-gray-900/70 border border-gray-800 p-2 text-center">
              <div className="text-[10px] text-gray-500 uppercase">Proposed</div>
              <div className="text-sm font-semibold text-blue-300">{counts.proposed}</div>
            </div>
            <div className="rounded bg-gray-900/70 border border-gray-800 p-2 text-center">
              <div className="text-[10px] text-gray-500 uppercase">Approved</div>
              <div className="text-sm font-semibold text-green-300">{counts.approved}</div>
            </div>
            <div className="rounded bg-gray-900/70 border border-gray-800 p-2 text-center">
              <div className="text-[10px] text-gray-500 uppercase">Implemented</div>
              <div className="text-sm font-semibold text-green-300">{counts.implemented}</div>
            </div>
            <div className="rounded bg-gray-900/70 border border-gray-800 p-2 text-center">
              <div className="text-[10px] text-gray-500 uppercase">Rejected</div>
              <div className="text-sm font-semibold text-red-300">{counts.rejected}</div>
            </div>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {decisions.length === 0 ? (
              <p className="text-xs text-gray-500">No decisions found or access is restricted.</p>
            ) : (
              decisions.slice(0, 12).map((d) => (
                <div key={d.id} className="rounded border border-gray-800 bg-gray-900/60 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-100 font-medium truncate">{d.title}</p>
                    <span className={`px-2 py-0.5 rounded text-[11px] ${statusTone(d.status || "")}`}>
                      {(d.status || "unknown").toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">Choice: {d.choice}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
