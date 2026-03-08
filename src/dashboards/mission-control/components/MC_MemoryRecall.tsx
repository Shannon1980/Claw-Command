"use client";

import { useState } from "react";
import { useMCMemory } from "../hooks/useMCData";

export default function MC_MemoryRecall() {
  const { memories, loading, refresh } = useMCMemory();
  const [query, setQuery] = useState("");
  const [recalling, setRecalling] = useState(false);

  const handleRecall = async () => {
    setRecalling(true);
    try {
      const res = await fetch(
        `/api/mission-control/recall?q=${encodeURIComponent(query)}`
      );
      await res.json();
      refresh();
    } finally {
      setRecalling(false);
    }
  };

  return (
    <div className="mc-panel p-4">
      <h2 className="mc-panel-header text-sm font-semibold text-gray-300 mb-4">
        Memory Recall
      </h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search memories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500"
        />
        <button
          onClick={handleRecall}
          disabled={recalling}
          className="px-3 py-1.5 rounded bg-gray-700 text-gray-200 text-sm font-medium hover:bg-gray-600 disabled:opacity-50"
        >
          Recall
        </button>
      </div>
      {loading ? (
        <div className="h-24 animate-pulse bg-gray-800/50 rounded" />
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {memories.length === 0 ? (
            <li className="text-sm text-gray-500 italic">No memories yet</li>
          ) : (
            memories.map((m) => (
              <li key={m.id} className="mc-card text-sm text-gray-300 p-2">
                {m.content}
                {m.source && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({m.source})
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
