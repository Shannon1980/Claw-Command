"use client";

import { useState } from "react";
import { Document, DocumentStatus, LinkedItem } from "@/lib/mock-docs";
import MarkdownRenderer from "@/components/chat/MarkdownRenderer";
import LinkPicker, { linkTypeConfig } from "@/components/docs/LinkPicker";

interface DocViewerProps {
  document: Document | null;
  onClose: () => void;
  onUpdate?: (doc: Document) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (doc: Document) => void;
}

const statusOptions: { value: DocumentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "exported", label: "Exported" },
];

function getWordCount(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export default function DocViewer({ document, onClose, onUpdate, onDelete, onDuplicate }: DocViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);

  if (!document) return null;

  const handleEdit = () => {
    setEditedContent(document.content);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/docs/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = {
          ...document,
          content: editedContent,
          updatedAt: new Date().toISOString(),
          versionHistory: data.versionHistory || document.versionHistory || [],
        };
        onUpdate?.(updated);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/docs/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate?.({
          ...document,
          status: newStatus as DocumentStatus,
          updatedAt: new Date().toISOString(),
          versionHistory: data.versionHistory || document.versionHistory || [],
        });
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/docs/${document.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete?.(document.id);
        onClose();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleExportMd = () => {
    const blob = new Blob([document.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportDocx = async () => {
    try {
      const docx = await import("docx");
      const { Document: DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

      const lines = document.content.split("\n");
      const children: docx.Paragraph[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          children.push(new Paragraph({ text: "" }));
          continue;
        }

        // Headings
        if (trimmed.startsWith("### ")) {
          children.push(new Paragraph({ text: trimmed.slice(4), heading: HeadingLevel.HEADING_3 }));
        } else if (trimmed.startsWith("## ")) {
          children.push(new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_2 }));
        } else if (trimmed.startsWith("# ")) {
          children.push(new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_1 }));
        }
        // Bullet lists
        else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const text = trimmed.slice(2);
          children.push(new Paragraph({
            children: parseInlineFormatting(text, TextRun),
            bullet: { level: 0 },
          }));
        }
        // Numbered lists
        else if (/^\d+\.\s/.test(trimmed)) {
          const text = trimmed.replace(/^\d+\.\s/, "");
          children.push(new Paragraph({
            children: parseInlineFormatting(text, TextRun),
            numbering: { reference: "default-numbering", level: 0 },
          }));
        }
        // Regular paragraphs
        else {
          children.push(new Paragraph({
            children: parseInlineFormatting(trimmed, TextRun),
            alignment: AlignmentType.LEFT,
          }));
        }
      }

      const doc = new DocxDocument({
        numbering: {
          config: [{
            reference: "default-numbering",
            levels: [{ level: 0, format: docx.LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT }],
          }],
        },
        sections: [{ children }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document.title}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export .docx:", error);
    }
  };

  const handleLinkedItemsChange = async (items: LinkedItem[]) => {
    try {
      const res = await fetch(`/api/docs/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedTo: items }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate?.({
          ...document,
          linkedTo: items,
          updatedAt: new Date().toISOString(),
          versionHistory: data.versionHistory || document.versionHistory || [],
        });
      }
    } catch (error) {
      console.error("Failed to update links:", error);
    }
  };

  const handleDuplicate = async () => {
    if (!onDuplicate) return;
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${document.title} (Copy)`,
          type: document.type,
          content: document.content,
          authorAgentId: null,
          agent: document.agent,
          agentEmoji: document.agentEmoji,
          linkedTo: document.linkedTo || [],
        }),
      });
      if (res.ok) {
        const created = await res.json();
        onDuplicate(created);
      }
    } catch (error) {
      console.error("Failed to duplicate:", error);
    }
  };

  const wordCount = getWordCount(document.content || "");
  const history = document.versionHistory || [];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-gray-950 border-l border-gray-800/50 z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-100 mb-1">
                {document.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{document.agent}</span>
                <span>Updated {new Date(document.updatedAt).toLocaleDateString()}</span>
                <span>{wordCount} words</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Linked Items */}
          <div className="mb-4">
            {!showLinkPicker ? (
              <div className="flex items-center gap-2 flex-wrap">
                {(document.linkedTo || []).map((item) => {
                  const cfg = linkTypeConfig[item.type];
                  return (
                    <span
                      key={`${item.type}-${item.id}`}
                      className={`${cfg.bg} ${cfg.color} px-2 py-0.5 rounded text-xs font-medium`}
                    >
                      {cfg.label}: {item.name}
                    </span>
                  );
                })}
                <button
                  onClick={() => setShowLinkPicker(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {(document.linkedTo || []).length > 0 ? "Edit links" : "+ Link to..."}
                </button>
              </div>
            ) : (
              <div>
                <LinkPicker
                  linkedItems={document.linkedTo || []}
                  onChange={handleLinkedItemsChange}
                />
                <button
                  onClick={() => setShowLinkPicker(false)}
                  className="text-xs text-gray-500 hover:text-gray-300 mt-1 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-800/50 flex-wrap">
            {!isEditing ? (
              <>
                <button
                  onClick={handleEdit}
                  className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs font-medium hover:bg-blue-500/30 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleExportMd}
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 border border-gray-700 rounded text-xs font-medium hover:bg-gray-700 transition-colors"
                >
                  Export .md
                </button>
                <button
                  onClick={handleExportDocx}
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 border border-gray-700 rounded text-xs font-medium hover:bg-gray-700 transition-colors"
                >
                  Export .docx
                </button>
                {onDuplicate && (
                  <button
                    onClick={handleDuplicate}
                    className="px-3 py-1.5 bg-gray-800 text-gray-300 border border-gray-700 rounded text-xs font-medium hover:bg-gray-700 transition-colors"
                  >
                    Duplicate
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 border border-gray-700 rounded text-xs font-medium hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}

            {/* Status */}
            <select
              value={document.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="ml-auto px-3 py-1.5 bg-gray-800 text-gray-300 border border-gray-700 rounded text-xs font-medium hover:bg-gray-700 transition-colors"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Version History Toggle */}
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  showHistory
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-800 border border-transparent"
                }`}
              >
                History ({history.length})
              </button>
            )}

            {/* Delete */}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded text-xs font-medium transition-colors"
              >
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  {deleting ? "..." : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1.5 text-gray-500 text-xs hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Version History Panel */}
          {showHistory && history.length > 0 && (
            <div className="mb-4 bg-gray-900 border border-gray-800 rounded-lg p-3">
              <h3 className="text-xs font-bold text-gray-400 mb-2">Version History</h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {[...history].reverse().map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 font-mono whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <span className="text-gray-400">{entry.summary}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-[70vh] bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-300 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
            />
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              {document.content ? (
                <MarkdownRenderer content={document.content} />
              ) : (
                <p className="text-gray-600 italic">No content yet. Click Edit to add content.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Helper to parse bold/italic in text for docx export
function parseInlineFormatting(text: string, TextRun: typeof import("docx").TextRun): import("docx").TextRun[] {
  const runs: import("docx").TextRun[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }
    if (match[2]) {
      runs.push(new TextRun({ text: match[2], bold: true }));
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[3], italics: true }));
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }));
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text }));
  }

  return runs;
}
