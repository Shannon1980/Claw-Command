"use client";

import { useState, useEffect } from "react";
import { DocumentType, LinkedItem } from "@/lib/mock-docs";
import LinkPicker from "@/components/docs/LinkPicker";

interface Agent {
  id: string;
  name: string;
  emoji: string;
}

interface DocCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: {
    title: string;
    type: DocumentType;
    content: string;
    authorAgentId: string | null;
    agent: string;
    agentEmoji: string;
    linkedTo: LinkedItem[];
  }) => void;
}

const typeOptions: { value: DocumentType; label: string }[] = [
  { value: "proposal", label: "Proposal" },
  { value: "capability_statement", label: "Capability Statement" },
  { value: "certification_doc", label: "Certification Doc" },
  { value: "report", label: "Report" },
  { value: "template", label: "Template" },
];

export default function DocCreateModal({ isOpen, onClose, onSave }: DocCreateModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("report");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [content, setContent] = useState("");
  const [linkedTo, setLinkedTo] = useState<LinkedItem[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/agents")
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setAgents(list);
          if (list.length > 0 && !selectedAgentId) {
            setSelectedAgentId(list[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, selectedAgentId]);

  if (!isOpen) return null;

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      title,
      type,
      content,
      authorAgentId: selectedAgentId || null,
      agent: selectedAgent?.name || "Unknown",
      agentEmoji: selectedAgent?.emoji || "",
      linkedTo,
    });

    setTitle("");
    setType("report");
    setContent("");
    setLinkedTo([]);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-gray-950 border border-gray-800/50 rounded-lg z-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-100">New Document</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DocumentType)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Assign to Agent</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                <option value="">None</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Link to</label>
            <LinkPicker linkedItems={linkedTo} onChange={setLinkedTo} />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write content in Markdown..."
              rows={10}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-300 border border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-40"
          >
            Create Document
          </button>
        </div>
      </div>
    </>
  );
}
