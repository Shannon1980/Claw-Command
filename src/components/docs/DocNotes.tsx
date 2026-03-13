"use client";

import { useState } from "react";
import type { DocNote } from "@/lib/docs/model";

interface DocNotesProps {
  docId: string;
  notes: DocNote[];
  onNoteAdded: (notes: DocNote[]) => void;
}

export default function DocNotes({ docId, notes, onNoteAdded }: DocNotesProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/docs/${docId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: "Shannon", content: content.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        onNoteAdded(data.notes || []);
        setContent("");
      }
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <h3 className="text-xs font-bold text-gray-400 mb-3">Notes & Communication</h3>

      {/* Existing notes */}
      {notes.length > 0 ? (
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="bg-gray-950 rounded-lg p-2.5 border border-gray-800/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-blue-400">{note.author}</span>
                <span className="text-[11px] text-gray-600 font-mono">
                  {new Date(note.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-300 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-600 mb-3">No notes yet. Add instructions or feedback below.</p>
      )}

      {/* Add note form */}
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note or instructions for the agent..."
          rows={2}
          className="flex-1 px-2.5 py-1.5 bg-gray-950 border border-gray-700 rounded-lg text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={sending || !content.trim()}
          className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-600/30 transition-colors disabled:opacity-40 self-end"
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
