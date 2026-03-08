"use client";

import { useState } from "react";
import { Opportunity, formatUsd, SOURCE_LABELS } from "@/lib/mock-pipeline";
import ApprovalBadge from "@/components/shared/ApprovalBadge";

function ActionBadge({ action, onPass }: { action: string; onPass?: () => void }) {
  if (!action) return null;
  const styles: Record<string, string> = {
    CAPTURE_NOW: "bg-green-500/20 text-green-400 border-green-500/30",
    CAPTURE_NOW_TEAM_SKYWARD: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    CAPTURE_NOW_TEAM_VORENTOE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    WATCH: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    PASS: "bg-gray-500/20 text-gray-500 border-gray-500/30",
  };
  const labels: Record<string, string> = {
    CAPTURE_NOW: "CAPTURE",
    CAPTURE_NOW_TEAM_SKYWARD: "SKYWARD",
    CAPTURE_NOW_TEAM_VORENTOE: "VORENTOE",
    WATCH: "WATCH",
    PASS: "PASS",
  };

  if (onPass) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onPass(); }}
        className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-bold cursor-pointer hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors ${styles[action] || styles.PASS}`}
        title="Pass on this opportunity"
      >
        PASS
      </button>
    );
  }

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-bold ${styles[action] || styles.PASS}`}>
      {labels[action] || action}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  if (!channel || channel === "direct") return null;
  if (channel === "teaming_skyward_prime") {
    return <span className="text-[10px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Skyward Prime</span>;
  }
  if (channel === "teaming_vorentoe_prime") {
    return <span className="text-[10px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">Vorentoe Prime</span>;
  }
  return null;
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-gray-400 w-8 text-right">
        {max === 10 ? value.toFixed(1) : `${Math.round(value)}%`}
      </span>
    </div>
  );
}

export default function OpportunityCard({ opp, onPass }: { opp: Opportunity; onPass?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const sourceMeta = SOURCE_LABELS[opp.source] || SOURCE_LABELS.manual;
  const daysUntilClose = opp.deadline
    ? Math.max(0, Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", opp.id)}
      className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 cursor-grab active:cursor-grabbing hover:border-gray-600 transition-all"
    >
      {/* Row 1: Title + Action badge */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-sm font-medium text-gray-200 leading-tight flex-1">
          {opp.sourceUrl ? (
            <a
              href={opp.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {opp.title}
            </a>
          ) : (
            opp.title
          )}
        </h4>
        {opp.opsEngineAction && <ActionBadge action={opp.opsEngineAction} onPass={onPass ? () => onPass(opp.id) : undefined} />}
      </div>

      {/* Row 2: Value + Channel + Source + Solicitation# */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-lg font-bold text-cyan-400 font-mono">{formatUsd(opp.valueUsd)}</span>
        <ChannelBadge channel={opp.channel} />
        <span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border ${sourceMeta.color}`}>
          {sourceMeta.label}
        </span>
        {opp.solicitationNumber && <span className="text-[10px] font-mono text-gray-500">#{opp.solicitationNumber}</span>}
      </div>

      {/* Row 3: Agency */}
      {opp.agency && <div className="text-xs text-gray-400 mb-3">{opp.agency}</div>}

      {/* Row 4: Fit + Win% bars side-by-side */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <ScoreBar label="Fit" value={opp.fitScore} max={10} color="bg-gradient-to-r from-green-500 to-emerald-400" />
        <ScoreBar label="Win %" value={opp.probability} max={100} color="bg-gradient-to-r from-blue-500 to-cyan-400" />
      </div>

      {/* Row 5: Days until close + Owner + Approval + More/Less */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {daysUntilClose !== null && (
            <span className={`font-mono ${daysUntilClose <= 45 ? "text-amber-400" : "text-gray-500"}`}>
              {daysUntilClose}d until close
            </span>
          )}
          <span className="text-gray-400">{opp.ownerEmoji} {opp.ownerAgent}</span>
        </div>
        <div className="flex items-center gap-2">
          <ApprovalBadge approval={opp.shannonApproval} />
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors font-mono"
          >
            {expanded ? "Less" : "More"}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
          {opp.description && (
            <p className="text-xs text-gray-400 leading-relaxed">{opp.description}</p>
          )}

          {/* Source URL */}
          {opp.sourceUrl && (
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Source Link</span>
              <div className="mt-1">
                <a
                  href={opp.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors break-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  {opp.sourceUrl} &rarr;
                </a>
              </div>
            </div>
          )}

          {/* Win Themes */}
          {opp.winThemes && opp.winThemes.length > 0 && (
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Win Themes</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {opp.winThemes.map((theme, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">{theme}</span>
                ))}
              </div>
            </div>
          )}

          {/* NAICS Codes */}
          {opp.naicsCodes && opp.naicsCodes.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-mono text-gray-500">NAICS:</span>
              {opp.naicsCodes.map((code) => (
                <span key={code} className="text-[10px] font-mono px-1 py-0.5 rounded bg-gray-800 text-gray-400">{code}</span>
              ))}
            </div>
          )}

          {/* Attachments */}
          {opp.attachments && opp.attachments.length > 0 && (
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Attachments</span>
              <div className="mt-1 space-y-1">
                {opp.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-gray-800 text-gray-500 uppercase">{att.type}</span>
                    {att.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Deadline + Set-aside */}
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            {opp.deadline && <span>Deadline: {new Date(opp.deadline).toLocaleDateString()}</span>}
            {opp.setAsideType && <span>Set-aside: {opp.setAsideType}</span>}
          </div>

          {/* Ops Engine link */}
          {opp.opsEngineAction && (
            <a
              href="/opportunity-engine"
              className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              View in Ops Engine &rarr;
            </a>
          )}
        </div>
      )}
    </div>
  );
}
