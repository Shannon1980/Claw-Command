"use client";

import { useState } from "react";
import { DocumentType } from "@/lib/mock-docs";

interface DocCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: {
    title: string;
    type: DocumentType;
    agent: string;
    agentEmoji: string;
    content: string;
  }) => void;
}

const typeOptions: { value: DocumentType; label: string }[] = [
  { value: "proposal", label: "Proposal" },
  { value: "capability_statement", label: "Capability Statement" },
  { value: "certification_doc", label: "Certification Doc" },
  { value: "report", label: "Report" },
  { value: "template", label: "Template" },
];

const agentOptions = [
  { name: "Bob", emoji: "🤖" },
  { name: "Bertha", emoji: "💼" },
  { name: "Veronica", emoji: "🛡️" },
  { name: "Muse", emoji: "🎨" },
  { name: "Skylar", emoji: "🌤️" },
  { name: "Forge", emoji: "⚙️" },
  { name: "Depa", emoji: "📊" },
  { name: "Peter", emoji: "📋" },
  { name: "Harmony", emoji: "👥" },
];

export default function DocCreateModal({
  isOpen,
  onClose,
  onSave,
}: DocCreateModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("template");
  const [agent, setAgent] = useState("Bob");
  const [agentEmoji, setAgentEmoji] = useState("🤖");
  const [content, setContent] = useState("");

  if (!isOpen) return null;

  const handleAgentChange = (agentName: string) => {
    const selected = agentOptions.find((a) => a.name === agentName);
    if (selected) {
      setAgent(selected.name);
      setAgentEmoji(selected.emoji);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    onSave({ title, type, agent, agentEmoji, content });
    
    // Reset form
    setTitle("");
    setType("template");
    setAgent("Bob");
    setAgentEmoji("🤖");
    setContent("");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-gray-950 border border-gray-800 rounded-lg z-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-100">New Document</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-gray-700"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-gray-700"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Agent */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">
              Assign to Agent
            </label>
            <select
              value={agent}
              onChange={(e) => handleAgentChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none focus:border-gray-700"
            >
              {agentOptions.map((opt) => (
                <option key={opt.name} value={opt.name}>
                  {opt.emoji} {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">
              Initial Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter initial content (optional)..."
              rows={8}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-gray-300 font-mono focus:outline-none focus:border-gray-700"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-300 border border-gray-700 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-sm font-medium hover:bg-cyan-500/30 transition-colors"
          >
            💾 Save Document
          </button>
        </div>
      </div>
    </>
  );
}
