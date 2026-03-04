"use client";

import { useState } from "react";
import { Document, DocumentStatus } from "@/lib/mock-docs";

interface DocViewerProps {
  document: Document | null;
  onClose: () => void;
}

const statusOptions: { value: DocumentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "exported", label: "Exported" },
];

export default function DocViewer({ document, onClose }: DocViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");

  if (!document) return null;

  const handleEdit = () => {
    setEditedContent(document.content);
    setIsEditing(true);
  };

  const handleSave = () => {
    // In a real app, this would save to the database
    console.log("Saving document:", editedContent);
    setIsEditing(false);
  };

  const handleExport = (format: "md" | "pdf") => {
    // In a real app, this would trigger a download
    const blob = new Blob([document.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.title}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-gray-950 border-l border-gray-800 z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-100 mb-1">
                {document.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="text-base">{document.agentEmoji}</span>
                  {document.agent}
                </span>
                <span>•</span>
                <span>Updated {new Date(document.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-100 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-800">
            {!isEditing ? (
              <>
                <button
                  onClick={handleEdit}
                  className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs font-medium hover:bg-blue-500/30 transition-colors"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleExport("md")}
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 border border-gray-700 rounded text-xs font-medium hover:bg-gray-700 transition-colors"
                >
                  📥 Export .md
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 border border-gray-700 rounded text-xs font-medium hover:bg-gray-700 transition-colors"
                >
                  📄 Export .pdf
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs font-medium hover:bg-green-500/30 transition-colors"
                >
                  💾 Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 border border-gray-700 rounded text-xs font-medium hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}

            {/* Status Dropdown */}
            <select
              value={document.status}
              onChange={(e) => {
                // In a real app, this would update the status
                console.log("Status changed to:", e.target.value);
              }}
              className="ml-auto px-3 py-1.5 bg-gray-800 text-gray-300 border border-gray-700 rounded text-xs font-medium hover:bg-gray-700 transition-colors"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-96 bg-gray-900 border border-gray-800 rounded p-4 text-sm text-gray-300 font-mono focus:outline-none focus:border-gray-700"
            />
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono bg-gray-900 border border-gray-800 rounded p-4">
                {document.content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
