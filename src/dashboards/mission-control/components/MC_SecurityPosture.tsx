"use client";

import { useMCSecurityPosture } from "../hooks/useMCData";

function Badge({ label, tone }: { label: string; tone: "green" | "amber" | "red" | "gray" }) {
  const map = {
    green: "bg-green-500/20 text-green-300 border-green-500/30",
    amber: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    red: "bg-red-500/20 text-red-300 border-red-500/30",
    gray: "bg-gray-700/30 text-gray-300 border-gray-600/40",
  } as const;

  return <span className={`px-2 py-0.5 rounded text-xs border ${map[tone]}`}>{label}</span>;
}

export default function MC_SecurityPosture() {
  const { security, loading, refresh } = useMCSecurityPosture();

  return (
    <div className="mc-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="mc-panel-header text-sm font-semibold text-gray-300">Security Posture</h2>
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
      ) : !security ? (
        <p className="text-xs text-gray-500">No security posture data available yet.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge label={security.ok ? "OK" : "Action Required"} tone={security.ok ? "green" : "red"} />
            <Badge label={`Blockers: ${security.blockers}`} tone={security.blockers > 0 ? "red" : "gray"} />
            <Badge label={`Warnings: ${security.warnings}`} tone={security.warnings > 0 ? "amber" : "gray"} />
          </div>

          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {security.findings.length === 0 ? (
              <p className="text-xs text-green-300">No active findings.</p>
            ) : (
              security.findings.map((f) => (
                <div key={f.code} className="rounded border border-gray-700 bg-gray-900/60 p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      label={f.severity.toUpperCase()}
                      tone={f.severity === "critical" ? "red" : f.severity === "warn" ? "amber" : "gray"}
                    />
                    <span className="text-[11px] text-gray-400 font-mono">{f.code}</span>
                  </div>
                  <p className="text-xs text-gray-200">{f.message}</p>
                  {f.fix ? <p className="text-[11px] text-gray-400 mt-1">Fix: {f.fix}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
