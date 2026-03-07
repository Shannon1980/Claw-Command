"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Document,
  DocumentType,
  DocumentStatus,
  DocumentCategory,
  ReviewStatus,
  LinkedItem,
  AssignTarget,
  DocumentPriority,
} from "@/lib/mock-docs";
import { CATEGORY_OPTIONS, SEED_DOCUMENTS } from "@/lib/mock-docs";
import DocCard from "@/components/docs/DocCard";
import DocViewer from "@/components/docs/DocViewer";
import DocCreateModal from "@/components/docs/DocCreateModal";
import ReviewQueue from "@/components/docs/ReviewQueue";
import DocAssignModal from "@/components/docs/DocAssignModal";

type ViewMode = "grid" | "list";
type TabMode = "all" | "queue";

export default function DocsPage() {
  const [documents, setDocuments] = useState<Document[]>(SEED_DOCUMENTS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [tabMode, setTabMode] = useState<TabMode>("queue");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignDoc, setAssignDoc] = useState<Document | null>(null);
  const [linkedFilter, setLinkedFilter] = useState<string>("all");
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; message: string | null; error?: string }>({
    loading: false,
    message: null,
  });
  const [syncPreview, setSyncPreview] = useState<{
    created: { id: string; title: string }[];
    updated: { id: string; title: string }[];
    deleted: { id: string; title: string }[];
  } | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/docs");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data)) {
        setDocuments(data.length > 0 ? data : SEED_DOCUMENTS);
      }
    } catch {
      // Keep seed docs on fetch failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(fetchDocuments, 15000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  // Filter logic
  const filteredDocs = documents.filter((doc) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!doc.title.toLowerCase().includes(q) && !(doc.content || "").toLowerCase().includes(q)) {
        return false;
      }
    }
    if (typeFilter !== "all" && doc.type !== typeFilter) return false;
    if (agentFilter !== "all" && doc.agent !== agentFilter) return false;
    if (statusFilter !== "all" && doc.status !== statusFilter) return false;
    if (categoryFilter !== "all" && doc.category !== categoryFilter) return false;
    if (linkedFilter !== "all") {
      const [linkType, linkId] = linkedFilter.split(":");
      if (!(doc.linkedTo || []).some((l) => l.type === linkType && l.id === linkId)) return false;
    }
    return true;
  });

  const handleCreateDoc = async (newDoc: {
    title: string;
    type: DocumentType;
    content: string;
    authorAgentId: string | null;
    agent: string;
    agentEmoji: string;
    linkedTo: LinkedItem[];
  }) => {
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDoc),
      });
      if (res.ok) {
        const created = await res.json();
        setDocuments((prev) => [{ ...newDoc, ...created, updatedAt: created.updatedAt || new Date().toISOString(), createdAt: created.createdAt || new Date().toISOString() }, ...prev]);
      }
    } catch (error) {
      console.error("Failed to create document:", error);
    }
  };

  const handleUpdateDoc = (updated: Document) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setSelectedDoc(updated);
  };

  const handleDeleteDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDuplicate = async (doc: Document) => {
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${doc.title} (copy)`,
          type: doc.type,
          content: doc.content,
          authorAgentId: null,
          linkedTo: doc.linkedTo || [],
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setDocuments((prev) => [{ ...doc, ...created, updatedAt: created.updatedAt || new Date().toISOString(), createdAt: created.createdAt || new Date().toISOString() }, ...prev]);
        setSelectedDoc(null);
      }
    } catch (error) {
      console.error("Failed to duplicate:", error);
    }
  };

  const handleDuplicateDoc = (doc: Document) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleSyncFromWorkspace = async () => {
    setSyncStatus({ loading: true, message: null, error: undefined });
    setSyncPreview(null);
    try {
      const res = await fetch("/api/sync/docs/trigger?preview=1", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.preview) {
        if (data.workspaceUnavailable) {
          setSyncStatus({
            loading: false,
            message: null,
            error: data.error || "Run ./scripts/sync-docs.sh from your local machine.",
          });
        } else {
          const hasChanges =
            (data.created?.length ?? 0) > 0 ||
            (data.updated?.length ?? 0) > 0 ||
            (data.deleted?.length ?? 0) > 0;
          setSyncStatus({ loading: false, message: null });
          if (hasChanges) {
            setSyncPreview({
              created: data.created ?? [],
              updated: data.updated ?? [],
              deleted: data.deleted ?? [],
            });
          } else {
            setSyncStatus({ loading: false, message: "Documents already up to date.", error: undefined });
          }
        }
      } else if (res.ok && data.success) {
        setSyncStatus({
          loading: false,
          message: `Synced ${data.docsUpserted ?? 0} document(s) from workspace.`,
        });
        setSyncPreview(null);
        fetchDocuments();
      } else if (res.status === 404) {
        setSyncStatus({
          loading: false,
          message: null,
          error: "Run from your local machine: ./scripts/sync-docs.sh",
        });
      } else {
        setSyncStatus({
          loading: false,
          message: null,
          error: data.error || "Sync failed",
        });
      }
    } catch {
      setSyncStatus({
        loading: false,
        message: null,
        error: "Run from local: ./scripts/sync-docs.sh",
      });
    }
  };

  const handleAcceptSync = async () => {
    if (!syncPreview) return;
    setSyncStatus({ loading: true, message: null });
    try {
      const res = await fetch("/api/sync/docs/trigger", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSyncStatus({
          loading: false,
          message: `Synced ${data.docsUpserted ?? 0} document(s).`,
        });
        setSyncPreview(null);
        fetchDocuments();
      } else {
        setSyncStatus({
          loading: false,
          message: null,
          error: data.error || "Apply failed",
        });
        setSyncPreview(null);
      }
    } catch {
      setSyncStatus({ loading: false, message: null, error: "Apply failed" });
      setSyncPreview(null);
    }
  };

  const handleDeclineSync = () => {
    setSyncPreview(null);
    setSyncStatus({ loading: false, message: null, error: undefined });
  };

  const handleReviewAction = async (docId: string, action: ReviewStatus) => {
    try {
      const res = await fetch(`/api/docs/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: action }),
      });
      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) => d.id === docId ? { ...d, reviewStatus: action, updatedAt: new Date().toISOString() } : d)
        );
      }
    } catch (error) {
      console.error("Failed to update review status:", error);
    }
  };

  const handleOpenAssign = (doc: Document) => {
    setAssignDoc(doc);
    setIsAssignModalOpen(true);
  };

  const handleAssign = async (assignment: {
    target: AssignTarget;
    agentId?: string;
    instructions?: string;
    priority?: DocumentPriority;
    targetId?: string;
  }) => {
    if (!assignDoc) return;
    try {
      const res = await fetch(`/api/docs/${assignDoc.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignment),
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments((prev) =>
          prev.map((d) => d.id === assignDoc.id ? { ...d, assignments: data.assignments, updatedAt: new Date().toISOString() } : d)
        );
        if (selectedDoc?.id === assignDoc.id) {
          setSelectedDoc((prev) => prev ? { ...prev, assignments: data.assignments } : null);
        }
      }
    } catch (error) {
      console.error("Failed to assign document:", error);
    }
  };

  const agents = ["all", ...new Set(documents.map((d) => d.agent).filter(Boolean))];

  // Collect all unique linked items across documents for filtering
  const allLinkedItems: { key: string; label: string }[] = [];
  const seenLinks = new Set<string>();
  for (const doc of documents) {
    for (const link of doc.linkedTo || []) {
      const key = `${link.type}:${link.id}`;
      if (!seenLinks.has(key)) {
        seenLinks.add(key);
        allLinkedItems.push({ key, label: `${link.name}` });
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Documents</h1>
            <p className="text-xs text-gray-500 font-mono">
              {filteredDocs.length} document{filteredDocs.length !== 1 ? "s" : ""}
              {documents.filter((d) => d.reviewStatus === "pending_review").length > 0 && (
                <span className="ml-2 text-amber-400">
                  ({documents.filter((d) => d.reviewStatus === "pending_review").length} pending review)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {syncStatus.message && (
              <span className="text-xs text-emerald-400">{syncStatus.message}</span>
            )}
            {syncStatus.error && (
              <span className="text-xs text-amber-400 max-w-xs" title={syncStatus.error}>
                {syncStatus.error}
              </span>
            )}
            <button
              onClick={handleSyncFromWorkspace}
              disabled={syncStatus.loading || loading}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 border border-gray-700/50 hover:border-gray-600"
              title="Sync documents from OpenClaw workspace (local) or run ./scripts/sync-docs.sh"
            >
              {syncStatus.loading ? "Syncing…" : "Sync from Workspace"}
            </button>
            <button
              onClick={() => fetchDocuments()}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              + New Document
            </button>
          </div>
        </div>

        {/* Tabs: Queue vs All */}
        <div className="flex items-center gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-lg p-0.5 w-fit">
          <button
            onClick={() => setTabMode("queue")}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              tabMode === "queue"
                ? "bg-gray-800 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Review Queue
            {documents.filter((d) => d.reviewStatus === "pending_review").length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                {documents.filter((d) => d.reviewStatus === "pending_review").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTabMode("all")}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              tabMode === "all"
                ? "bg-gray-800 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            All Documents
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="flex-1 min-w-64 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DocumentType | "all")}
            className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="all">All Types</option>
            <option value="proposal">Proposal</option>
            <option value="capability_statement">Capability Statement</option>
            <option value="certification_doc">Certification Doc</option>
            <option value="report">Report</option>
            <option value="template">Template</option>
          </select>

          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          >
            {agents.map((agent) => (
              <option key={agent} value={agent}>
                {agent === "all" ? "All Agents" : agent}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | "all")}
            className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="exported">Exported</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as DocumentCategory | "all")}
            className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="all">All Categories</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {allLinkedItems.length > 0 && (
            <select
              value={linkedFilter}
              onChange={(e) => setLinkedFilter(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            >
              <option value="all">All Links</option>
              {allLinkedItems.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          )}

          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === "grid"
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === "list"
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* Content */}
        {tabMode === "queue" ? (
          /* Review Queue Tab */
          loading && documents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">Loading documents...</p>
            </div>
          ) : (
            <ReviewQueue
              documents={filteredDocs}
              onSelect={(doc) => setSelectedDoc(doc)}
              onReviewAction={handleReviewAction}
            />
          )
        ) : (
          /* All Documents Tab */
          loading && documents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">Loading documents...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3 opacity-30">&#128196;</div>
              <p className="text-gray-500 text-sm mb-4">
                {documents.length === 0
                  ? "No documents yet"
                  : "No documents match your filters"}
              </p>
              {documents.length === 0 && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-600/30 transition-colors"
                >
                  Create your first document
                </button>
              )}
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                  : "space-y-3"
              }
            >
              {filteredDocs.map((doc) => (
                <DocCard
                  key={doc.id}
                  document={doc}
                  onClick={() => setSelectedDoc(doc)}
                />
              ))}
            </div>
          )
        )}
      </div>

      <DocViewer
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onUpdate={handleUpdateDoc}
        onDelete={handleDeleteDoc}
        onDuplicate={handleDuplicateDoc}
        onAssign={handleOpenAssign}
      />

      <DocCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateDoc}
      />

      {syncPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-gray-100">Sync workspace changes</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Review changes before applying. Accept to sync or decline to cancel.
              </p>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
              {syncPreview.created.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide mb-1.5">
                    New ({syncPreview.created.length})
                  </p>
                  <ul className="text-sm text-gray-300 space-y-1 max-h-32 overflow-y-auto">
                    {syncPreview.created.slice(0, 10).map((d) => (
                      <li key={d.id} className="truncate">+ {d.title}</li>
                    ))}
                    {syncPreview.created.length > 10 && (
                      <li className="text-gray-500">+ {syncPreview.created.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
              {syncPreview.updated.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-1.5">
                    Updated ({syncPreview.updated.length})
                  </p>
                  <ul className="text-sm text-gray-300 space-y-1 max-h-32 overflow-y-auto">
                    {syncPreview.updated.slice(0, 10).map((d) => (
                      <li key={d.id} className="truncate">~ {d.title}</li>
                    ))}
                    {syncPreview.updated.length > 10 && (
                      <li className="text-gray-500">~ {syncPreview.updated.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
              {syncPreview.deleted.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-400 uppercase tracking-wide mb-1.5">
                    No longer in workspace ({syncPreview.deleted.length})
                  </p>
                  <ul className="text-sm text-gray-400 space-y-1 max-h-32 overflow-y-auto">
                    {syncPreview.deleted.slice(0, 10).map((d) => (
                      <li key={d.id} className="truncate">− {d.title}</li>
                    ))}
                    {syncPreview.deleted.length > 10 && (
                      <li className="text-gray-500">− {syncPreview.deleted.length - 10} more</li>
                    )}
                  </ul>
                  <p className="text-xs text-gray-500 mt-1">These will stay in the database; they are only removed from the workspace.</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
              <button
                onClick={handleDeclineSync}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptSync}
                disabled={syncStatus.loading}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {syncStatus.loading ? "Applying…" : "Accept"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DocAssignModal
        isOpen={isAssignModalOpen}
        document={assignDoc}
        onClose={() => { setIsAssignModalOpen(false); setAssignDoc(null); }}
        onAssign={handleAssign}
      />
    </div>
  );
}
