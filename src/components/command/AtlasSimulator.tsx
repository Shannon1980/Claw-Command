
"use client";

import { useEffect, useState } from "react";
import { useGatewayContext } from "@/lib/contexts/GatewayContext";

export default function AtlasSimulator() {
  const { updateSubagentProgress, state } = useGatewayContext();
  const [running, setRunning] = useState(false);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!running) return;
    const atlasId = 'atlas-sim-1';
    
    // Resume progress if already in state
    const existing = state.subagentProgress.get(atlasId);
    if (existing && existing.progress < 100) {
      setPercent(existing.progress);
    }

    const timer = setInterval(() => {
      setPercent((p) => {
        const next = Math.min(p + 5, 100);
        updateSubagentProgress(atlasId, {
          taskId: atlasId,
          agentId: 'atlas',
          status: next >= 100 ? 'completed' : 'running',
          progress: next,
          updatedAt: new Date().toISOString(),
          message: next >= 100 ? 'Atlas simulation complete' : `Atlas building Phase 2... ${next}%`,
        });
        if (next >= 100) {
          clearInterval(timer);
          setRunning(false);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, updateSubagentProgress, state.subagentProgress]);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-lg mt-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl">🖥️</span>
        <div>
          <h4 className="text-sm font-semibold text-gray-200">Atlas Simulator</h4>
          <p className="text-xs text-gray-400">Injects subagent progress events to test UI.</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {percent > 0 && percent < 100 && (
          <div className="w-32 bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
             <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>
        )}
        
        <button
          onClick={() => {
            if (percent >= 100) setPercent(0);
            setRunning(!running);
          }}
          className="px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
        >
          {running ? "Stop" : percent >= 100 ? "Restart" : "Start"}
        </button>
      </div>
    </div>
  );
}
