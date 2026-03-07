"use client";

import { useState } from "react";
import { Document, DocumentStatus, LinkedItem } from "@/lib/mock-docs";
import MarkdownRenderer from "@/components/chat/MarkdownRenderer";
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

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

const linkTypeColors: Record<string, string> = {
  deal: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  certification: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  task: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function markdownToDocxParagraphs(md: string): Paragraph[] {
  const lines = md.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6,
      };
      paragraphs.push(new Paragraph({
        heading: headingMap[level] || HeadingLevel.HEADING_1,
        children: parseInlineFormatting(headingMatch[2]),
      }));
      continue;
    }

    // Bullet lists
    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)/);
    if (bulletMatch) {
      const checkboxMatch = bulletMatch[1].match(/^\[([ x])\]\s*(.*)/);
      if (checkboxMatch) {
        const checked = checkboxMatch[1] === "x";
        paragraphs.push(new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: checked ? "[x] " : "[ ] ", bold: true }),
            ...parseInlineFormatting(checkboxMatch[2]),
          ],
        }));
      } else {
        paragraphs.push(new Paragraph({
          bullet: { level: 0 },
          children: parseInlineFormatting(bulletMatch[1]),
        }));
      }
      continue;
    }

    // Numbered lists
    const numMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (numMatch) {
      paragraphs.push(new Paragraph({
        bullet: { level: 0 },
        children: parseInlineFormatting(numMatch[1]),
      }));
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "---" })],
      }));
      continue;
    }

    // Regular paragraph
    paragraphs.push(new Paragraph({
      children: parseInlineFormatting(trimmed),
    }));
  }

  return paragraphs;
}

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|([^*`]+))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      runs.push(new TextRun({ text: match[2], bold: true, italics: true }));
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[3], bold: true }));
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], italics: true }));
    } else if (match[5]) {
      runs.push(new TextRun({ text: match[5], font: "Courier New", size: 20 }));
    } else if (match[6]) {
      runs.push(new TextRun({ text: match[6] }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text })];
}

export default function DocViewer({ document, onClose, onUpdate, onDelete, onDuplicate }: DocViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        const updated = { ...document, content: editedContent, updatedAt: new Date().toISOString() };
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
        onUpdate?.({ ...document, status: newStatus as DocumentStatus, updatedAt: new Date().toISOString() });
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
    const doc = new DocxDocument({
      sections: [{
        properties: {},
        children: markdownToDocxParagraphs(document.content),
      }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${document.title}.docx`);
  };

  const handleRemoveLink = async (linkToRemove: LinkedItem) => {
    const updatedLinks = (document.linkedTo || []).filter(
      (l) => !(l.type === linkToRemove.type && l.id === linkToRemove.id)
    );
    try {
      const res = await fetch(`/api/docs/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedTo: updatedLinks }),
      });
      if (res.ok) {
        onUpdate?.({ ...document, linkedTo: updatedLinks, updatedAt: new Date().toISOString() });
      }
    } catch { /* */ }
  };

  const words = wordCount(document.content);
  const linkedItems = document.linkedTo || [];

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
                <span>{words.toLocaleString()} words</span>
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

          {/* Linked items */}
          {linkedItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {linkedItems.map((link, i) => (
                <span
                  key={`${link.type}-${link.id}-${i}`}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${linkTypeColors[link.type] || "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}
                >
                  <span className="capitalize">{link.type}:</span> {link.name}
                  <button
                    onClick={() => handleRemoveLink(link)}
                    className="ml-0.5 hover:opacity-70 text-[10px]"
                    title="Remove link"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}

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
                    onClick={() => onDuplicate(document)}
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

          {/* Content */}
          {isEditing ? (
            <div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-[70vh] bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-300 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
              />
              <p className="mt-1 text-xs text-gray-600 text-right">{wordCount(editedContent).toLocaleString()} words</p>
            </div>
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
