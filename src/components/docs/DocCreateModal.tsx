"use client";

import { useState, useEffect } from "react";
import { DocumentType, LinkedItem } from "@/lib/mock-docs";
import LinkPicker from "@/components/docs/LinkPicker";
import { useAgentStore } from "@/lib/stores/agentStore";

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

const linkTypeColors: Record<string, string> = {
  deal: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  certification: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  task: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

export default function DocCreateModal({ isOpen, onClose, onSave }: DocCreateModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("report");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [content, setContent] = useState("");
  const [linkedTo, setLinkedTo] = useState<LinkedItem[]>([]);
  const { agents, fetchAgents } = useAgentStore();

  // Linkable items
  const [deals, setDeals] = useState<{ id: string; name: string }[]>([]);
  const [certs, setCerts] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; name: string }[]>([]);
  const [linkType, setLinkType] = useState<"deal" | "certification" | "task">("deal");
  const [linkId, setLinkId] = useState("");
  const [showLinkPicker, setShowLinkPicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();

      fetch("/api/opportunities").then((r) => r.json()).then((data) => {
        setDeals((Array.isArray(data) ? data : []).map((d: Record<string, string>) => ({ id: d.id, name: d.title || d.name || d.id })));
      }).catch(() => {});

      fetch("/api/certifications").then((r) => r.json()).then((data) => {
        setCerts((Array.isArray(data) ? data : []).map((c: Record<string, string>) => ({ id: c.id, name: c.name || c.id })));
      }).catch(() => {});

      fetch("/api/tasks").then((r) => r.json()).then((data) => {
        const list = Array.isArray(data) ? data : (data?.tasks || []);
        setTasks(list.map((t: Record<string, string>) => ({ id: t.id, name: t.title || t.name || t.id })));
      }).catch(() => {});
    }
  }, [isOpen, fetchAgents]);

  // Auto-select first agent when agents load
  useEffect(() => {
    if (isOpen && agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [isOpen, agents, selectedAgentId]);

  if (!isOpen) return null;

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const linkableItems = linkType === "deal" ? deals : linkType === "certification" ? certs : tasks;

  const handleAddLink = () => {
    if (!linkId) return;
    const item = linkableItems.find((i) => i.id === linkId);
    if (!item) return;
    if (linkedTo.some((l) => l.type === linkType && l.id === linkId)) return;
    setLinkedTo([...linkedTo, { type: linkType, id: linkId, name: item.name }]);
    setLinkId("");
  };

  const handleRemoveLink = (idx: number) => {
    setLinkedTo(linkedTo.filter((_, i) => i !== idx));
  };

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
    setShowLinkPicker(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-gray-950 border border-gray-800/50 rounded-lg z-50 p-6 max-h-[90vh] overflow-y-auto">
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

          {/* Link to deals/certs/tasks */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-gray-500 font-medium">Link to</label>
              <button
                type="button"
                onClick={() => setShowLinkPicker(!showLinkPicker)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {showLinkPicker ? "Hide" : "+ Add link"}
              </button>
            </div>

            {/* Existing links */}
            {linkedTo.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {linkedTo.map((link, i) => (
                  <span
                    key={`${link.type}-${link.id}-${i}`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${linkTypeColors[link.type] || "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}
                  >
                    <span className="capitalize">{link.type}:</span> {link.name}
                    <button onClick={() => handleRemoveLink(i)} className="ml-0.5 hover:opacity-70">x</button>
                  </span>
                ))}
              </div>
            )}

            {showLinkPicker && (
              <div className="flex gap-2">
                <select
                  value={linkType}
                  onChange={(e) => { setLinkType(e.target.value as "deal" | "certification" | "task"); setLinkId(""); }}
                  className="px-2 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                >
                  <option value="deal">Deal</option>
                  <option value="certification">Certification</option>
                  <option value="task">Task</option>
                </select>
                <select
                  value={linkId}
                  onChange={(e) => setLinkId(e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                >
                  <option value="">Select {linkType}...</option>
                  {linkableItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddLink}
                  disabled={!linkId}
                  className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-600/30 transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            )}
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
