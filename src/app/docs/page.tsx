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
import { CATEGORY_OPTIONS, mockDocuments } from "@/lib/mock-docs";
import DocCard from "@/components/docs/DocCard";
import DocViewer from "@/components/docs/DocViewer";
import DocCreateModal from "@/components/docs/DocCreateModal";
import ReviewQueue from "@/components/docs/ReviewQueue";
import DocAssignModal from "@/components/docs/DocAssignModal";

type ViewMode = "grid" | "list";
type TabMode = "all" | "queue";

export default function DocsPage() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [loading, setLoading] = useState(false);
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

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/docs");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setDocuments(data);
      }
    } catch {
      // Keep existing documents (mock data) on fetch failure
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

          <div className="flex items-center gap-3">
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

      <DocAssignModal
        isOpen={isAssignModalOpen}
        document={assignDoc}
        onClose={() => { setIsAssignModalOpen(false); setAssignDoc(null); }}
        onAssign={handleAssign}
      />
    </div>
  );
}
