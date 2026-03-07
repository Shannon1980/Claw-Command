"use client";

import { useState, useEffect } from "react";
import type { Document, AssignTarget, DocumentPriority } from "@/lib/mock-docs";
import { PRIORITY_OPTIONS } from "@/lib/mock-docs";
import { useAgentStore } from "@/lib/stores/agentStore";

interface Pipeline {
  id: string;
  name: string;
  status: string;
}

interface DocAssignModalProps {
  isOpen: boolean;
  document: Document | null;
  onClose: () => void;
  onAssign: (assignment: {
    target: AssignTarget;
    agentId?: string;
    instructions?: string;
    priority?: DocumentPriority;
    targetId?: string;
  }) => void;
}

export default function DocAssignModal({ isOpen, document, onClose, onAssign }: DocAssignModalProps) {
  const [target, setTarget] = useState<AssignTarget>("task");
  const [agentId, setAgentId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [priority, setPriority] = useState<DocumentPriority>("medium");
  const [pipelineId, setPipelineId] = useState("");
  const { agents, fetchAgents } = useAgentStore();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchAgents();

    fetch("/api/pipelines").then((r) => r.json()).then((data) => {
      setPipelines(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, [isOpen]);

  if (!isOpen || !document) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onAssign({
        target,
        agentId: target === "task" ? agentId || undefined : undefined,
        instructions: instructions.trim() || undefined,
        priority,
        targetId: target === "orchestration" ? pipelineId || undefined : undefined,
      });
      // Reset form
      setTarget("task");
      setAgentId("");
      setInstructions("");
      setPriority("medium");
      setPipelineId("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const targetOptions: { value: AssignTarget; label: string; description: string }[] = [
    { value: "task", label: "Spawn Agent Task", description: "Create a task and optionally assign an agent to work on this document" },
    { value: "memory", label: "Save to Memory", description: "Store this document's content as a memory entry for agents to recall" },
    { value: "orchestration", label: "Attach to Pipeline", description: "Link this document to an orchestration pipeline" },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-gray-950 border border-gray-800/50 rounded-lg z-50 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-100">Assign Document</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[350px]">{document.title}</p>
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

        <div className="space-y-4">
          {/* Target selection */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 font-medium">Assign To</label>
            <div className="space-y-2">
              {targetOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTarget(opt.value)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    target === opt.value
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                      : "bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700"
                  }`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Agent selection (for task target) */}
          {target === "task" && (
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Assign Agent</label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                <option value="">No specific agent</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Pipeline selection (for orchestration target) */}
          {target === "orchestration" && (
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Pipeline</label>
              <select
                value={pipelineId}
                onChange={(e) => setPipelineId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                <option value="">Select pipeline...</option>
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                ))}
              </select>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Priority</label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPriority(opt.value)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    priority === opt.value
                      ? `${opt.color} bg-gray-800 border-gray-600`
                      : "text-gray-500 bg-gray-900 border-gray-800 hover:text-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">
              Instructions {target === "task" ? "for Agent" : "(optional)"}
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={
                target === "task"
                  ? "Describe what the agent should do with this document..."
                  : target === "memory"
                  ? "Any additional context for this memory entry..."
                  : "Notes about how this document relates to the pipeline..."
              }
              rows={4}
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
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {submitting ? "Assigning..." : `Assign to ${target === "task" ? "Task" : target === "memory" ? "Memory" : "Pipeline"}`}
          </button>
        </div>
      </div>
    </>
  );
}
