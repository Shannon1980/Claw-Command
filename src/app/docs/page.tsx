"use client";

import { useState, useEffect } from "react";
import {
  Document,
  DocumentType,
  DocumentStatus,
  mockDocuments,
} from "@/lib/mock-docs";
import DocCard from "@/components/docs/DocCard";
import DocViewer from "@/components/docs/DocViewer";
import DocCreateModal from "@/components/docs/DocCreateModal";

type ViewMode = "grid" | "list";

export default function DocsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch documents
  useEffect(() => {
    setLoading(true);
    fetch("/api/docs")
      .then((res) => res.json())
      .then((data) => {
        const docs = Array.isArray(data) ? data : data?.docs ?? [];
        setDocuments(docs.length > 0 ? docs : mockDocuments);
        setFilteredDocs(docs.length > 0 ? docs : mockDocuments);
      })
      .catch((err) => {
        console.error("Failed to load documents:", err);
        setDocuments(mockDocuments);
        setFilteredDocs(mockDocuments);
      })
      .finally(() => setLoading(false));
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = documents;

    if (searchQuery) {
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((doc) => doc.type === typeFilter);
    }

    if (agentFilter !== "all") {
      filtered = filtered.filter((doc) => doc.agent === agentFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((doc) => doc.status === statusFilter);
    }

    setFilteredDocs(filtered);
  }, [searchQuery, typeFilter, agentFilter, statusFilter, documents]);

  const handleCreateDoc = async (newDoc: {
    title: string;
    type: DocumentType;
    agent: string;
    agentEmoji: string;
    content: string;
  }) => {
    try {
      const response = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDoc),
      });

      if (response.ok) {
        const createdDoc = await response.json();
        setDocuments([...documents, createdDoc]);
      }
    } catch (error) {
      console.error("Failed to create document:", error);
    }
  };

  const agents = ["all", ...new Set(documents.map((d) => d.agent))];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Documents</h1>
            <p className="text-xs text-gray-500 font-mono">
              {filteredDocs.length} document{filteredDocs.length !== 1 ? "s" : ""}
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-sm font-medium hover:bg-cyan-500/30 transition-colors"
          >
            + New Document
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="flex-1 min-w-64 px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-gray-700"
          />

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DocumentType | "all")}
            className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-gray-700"
          >
            <option value="all">All Types</option>
            <option value="proposal">Proposal</option>
            <option value="capability_statement">Capability Statement</option>
            <option value="certification_doc">Certification Doc</option>
            <option value="report">Report</option>
            <option value="template">Template</option>
          </select>

          {/* Agent Filter */}
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-gray-700"
          >
            {agents.map((agent) => (
              <option key={agent} value={agent}>
                {agent === "all" ? "All Agents" : agent}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | "all")}
            className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-gray-700"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="exported">Exported</option>
          </select>

          {/* View Toggle */}
          <div className="flex bg-gray-900 border border-gray-800 rounded p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                viewMode === "grid"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                viewMode === "list"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* Document Grid/List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">Loading documents...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No documents found</p>
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
        )}
      </div>

      {/* Document Viewer */}
      <DocViewer
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />

      {/* Create Modal */}
      <DocCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateDoc}
      />
    </div>
  );
}
