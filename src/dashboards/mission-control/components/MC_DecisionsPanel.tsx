"use client";

import { useMemo, useState } from "react";
import { useMCDecisions } from "../hooks/useMCData";

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved" || s === "implemented") return "text-green-300 bg-green-500/20";
  if (s === "rejected") return "text-red-300 bg-red-500/20";
  if (s === "proposed") return "text-blue-300 bg-blue-500/20";
  return "text-gray-300 bg-gray-600/30";
}

const STATUS_OPTIONS = ["proposed", "approved", "implemented", "rejected"];

export default function MC_DecisionsPanel() {
  const { decisions, loading, refresh } = useMCDecisions();
  const [title, setTitle] = useState("");
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  async function handleCreateDecision() {
    if (!title.trim() || !choice.trim()) {
      setMessage("Title and choice are required.");
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), choice: choice.trim(), status: "proposed" }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setMessage("Create denied: operator role or higher required.");
          return;
        }
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "Failed to create decision.");
        return;
      }

      setTitle("");
      setChoice("");
      setMessage("Decision created.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusUpdate(id: string, status: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/decisions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setMessage("Update denied: operator role or higher required.");
          return;
        }
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "Failed to update status.");
        return;
      }

      setMessage("Decision updated.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this decision? This action cannot be undone.");
    if (!confirmed) return;

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/decisions/${id}`, { method: "DELETE" });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setMessage("Delete denied: admin role required.");
          return;
        }
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "Failed to delete decision.");
        return;
      }

      setMessage("Decision deleted.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

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

          <div className="rounded border border-gray-800 bg-gray-900/50 p-3 mb-3 space-y-2">
            <p className="text-xs text-gray-400">Create Decision (operator+)</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Decision title"
              className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100"
            />
            <textarea
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              placeholder="Selected choice / rationale"
              rows={2}
              className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleCreateDecision}
                disabled={busy}
                className="px-3 py-1.5 rounded bg-blue-600/70 hover:bg-blue-600 text-xs text-white disabled:opacity-60"
              >
                {busy ? "Saving..." : "Create"}
              </button>
              {message ? <span className="text-xs text-gray-400">{message}</span> : null}
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
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500">Set status:</span>
                      <select
                        value={(d.status || "proposed").toLowerCase()}
                        onChange={(e) => handleStatusUpdate(d.id, e.target.value)}
                        disabled={busy}
                        className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(d.id)}
                      disabled={busy}
                      className="px-2 py-1 text-[11px] rounded border border-red-500/40 text-red-300 hover:bg-red-500/20 disabled:opacity-60"
                    >
                      Delete (admin)
                    </button>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Set status:</span>
                    <select
                      value={(d.status || "proposed").toLowerCase()}
                      onChange={(e) => handleStatusUpdate(d.id, e.target.value)}
                      disabled={busy}
                      className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
