"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCertificationHealth,
  parseCertificationsApiResponse,
  Certification,
  CertStatus,
  CertLevel,
  CERT_LEVELS,
} from "@/lib/certifications/model";
import CertCard from "@/components/certifications/CertCard";
import CertEditModal from "@/components/certifications/CertEditModal";

const LEVEL_OPTIONS: CertLevel[] = [...CERT_LEVELS];
const STATUS_OPTIONS: { value: CertStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "EXPIRING", label: "Expiring Soon" },
  { value: "EXPIRED", label: "Expired" },
];

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    level: "Federal" as CertLevel,
    authority: "",
    status: "NOT_STARTED" as CertStatus,
    description: "",
    dueDate: "",
  });

  const fetchCertifications = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);

    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await fetch("/api/certifications", { cache: "no-store" });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(
          payload && typeof payload.error === "string"
            ? payload.error
            : "Failed to load certifications"
        );
      }

      const parsed = parseCertificationsApiResponse(payload);
      setCertifications(parsed.data);
      setLastUpdated(parsed.meta.lastUpdated);
      setError(null);
    } catch (err) {
      console.error("Failed to load certifications:", err);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCertifications();
  }, [fetchCertifications]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCertifications({ silent: true });
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchCertifications]);

  const handleSave = async (updated: Certification) => {
    try {
      const res = await fetch(`/api/certifications/${updated.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: updated.name,
          level: updated.level,
          authority: updated.authority,
          status: updated.status,
          dueDate: updated.dueDate,
          appliedDate: updated.appliedDate,
          decisionExpected: updated.decisionExpected,
          expiresDate: updated.expiresDate,
          description: updated.description,
          notes: updated.notes,
          documents: updated.documents,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setCertifications((prev) =>
          prev.map((c) => (c.id === saved.id ? saved : c))
        );
        setLastUpdated(new Date().toISOString());
        setEditingCert(null);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
    } catch (err) {
      console.error("Failed to save certification:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setError("Please enter a certification name");
      return;
    }
    if (!createForm.authority.trim()) {
      setError("Please enter the issuing authority");
      return;
    }
    try {
      const res = await fetch("/api/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          level: createForm.level,
          authority: createForm.authority,
          status: createForm.status,
          description: createForm.description || undefined,
          dueDate: createForm.dueDate || undefined,
          documents: [],
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setCertifications((prev) => [...prev, { ...created, documents: created.documents || [] }]);
        setLastUpdated(new Date().toISOString());
        setShowCreateForm(false);
        setCreateForm({ name: "", level: "Federal", authority: "", status: "NOT_STARTED", description: "", dueDate: "" });
        setError(null);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/certifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCertifications((prev) => prev.filter((c) => c.id !== id));
        setLastUpdated(new Date().toISOString());
        setDeleteConfirm(null);
        if (editingCert?.id === id) setEditingCert(null);
      }
    } catch {
      // silent
    }
  };

  const health = getCertificationHealth(certifications);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">
              CERTIFICATION TRACKER
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              {certifications.length} certification{certifications.length !== 1 ? "s" : ""} &middot; auto-refreshes every 15s
              {lastUpdated ? ` · last updated ${new Date(lastUpdated).toLocaleTimeString()}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {error && (
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-xs">{error}</span>
                <button onClick={() => setError(null)} className="text-amber-500 hover:text-amber-300 text-xs">dismiss</button>
              </div>
            )}

            {/* Overall Health Indicator */}
            {certifications.length > 0 && (
              <div className="text-right">
                <div className="text-xs text-gray-500">Overall Health</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-green-400 text-xs font-mono">
                    {health.onTrack} on track
                  </span>
                  {health.atRisk > 0 && (
                    <span className="text-amber-400 text-xs font-mono">
                      {health.atRisk} at risk
                    </span>
                  )}
                  {health.critical > 0 && (
                    <span className="text-red-400 text-xs font-mono animate-pulse">
                      {health.critical} critical
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => fetchCertifications()}
              disabled={loading || refreshing}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
            >
              {showCreateForm ? "Cancel" : "+ Add Certification"}
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-medium text-gray-300">New Certification</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Certification name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. 8(a) Program, WOSB, Maryland MBE..."
                  className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Issuing authority</label>
                <input
                  type="text"
                  value={createForm.authority}
                  onChange={(e) => setCreateForm({ ...createForm, authority: e.target.value })}
                  placeholder="e.g. SBA, MDOT, MoCo..."
                  className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Level</label>
                <select
                  value={createForm.level}
                  onChange={(e) => setCreateForm({ ...createForm, level: e.target.value as CertLevel })}
                  className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                >
                  {LEVEL_OPTIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Initial status</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as CertStatus })}
                  className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Due date (optional)</label>
                <input
                  type="date"
                  value={createForm.dueDate}
                  onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Description (optional)</label>
              <input
                type="text"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Brief description or notes..."
                className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCreate}
                disabled={!createForm.name.trim() || !createForm.authority.trim()}
                className="px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors disabled:opacity-40"
              >
                Add Certification
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading && certifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">Loading certifications...</p>
          </div>
        ) : error && certifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-3 opacity-50">⚠️</div>
            <p className="text-amber-300 text-sm mb-4">Could not load certifications right now.</p>
            <button
              onClick={() => fetchCertifications()}
              className="px-4 py-2 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-lg text-sm font-medium hover:bg-amber-600/30 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : certifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-30">&#128203;</div>
            <p className="text-gray-500 text-sm mb-4">No certifications tracked yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-600/30 transition-colors"
            >
              Add your first certification
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {certifications.map((cert) => (
              <div key={cert.id} className="relative group">
                <CertCard
                  certification={cert}
                  onEdit={() => setEditingCert(cert)}
                />
                {/* Delete button overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {deleteConfirm === cert.id ? (
                    <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(cert.id); }}
                        className="px-2 py-1 text-[11px] font-medium bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                        className="px-1.5 py-1 text-[11px] text-gray-500 hover:text-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(cert.id); }}
                      className="px-2 py-1 text-[11px] font-medium text-red-400 bg-gray-900/90 border border-gray-700 hover:bg-red-600/20 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {editingCert && (
          <CertEditModal
            key={editingCert.id}
            certification={editingCert}
            onSave={handleSave}
            onClose={() => setEditingCert(null)}
          />
        )}

        {/* Legend */}
        {certifications.length > 0 && (
          <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 mb-2 font-medium">
              Status Legend
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-gray-500/10 border border-gray-500/30 text-gray-400 rounded">
                  Not Started
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded">
                  In Progress
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded">
                  Submitted
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded">
                  Approved
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded">
                  Expiring Soon
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded">
                  Expired
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
