"use client";

import { useState, useEffect } from "react";
import type { Task, TaskStatus, TaskPriority } from "@/lib/stores/taskStore";

interface Agent {
  id: string;
  name: string;
  emoji: string;
}

interface TaskComment {
  id: string;
  task_id: string;
  author: string;
  content: string;
  parent_comment_id?: string | null;
  created_at: string;
}

interface TaskEditModalProps {
  task: Task | null;
  agents: Agent[];
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "inbox", label: "Inbox" },
  { value: "backlog", label: "Backlog" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "quality_review", label: "Quality Review" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function TaskEditModal({
  task,
  agents,
  onClose,
  onSaved,
}: TaskEditModalProps) {
  const isCreate = task === null;
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "backlog");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [project, setProject] = useState(task?.project ?? "");
  const [ticketRef, setTicketRef] = useState(task?.ticketRef ?? "");
  const [dependsOnShannon, setDependsOnShannon] = useState(task?.dependsOnShannon ?? false);
  const [assignedTo, setAssignedTo] = useState(task?.assignedToAgentId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (task?.id) {
      fetch(`/api/tasks/${task.id}/comments`)
        .then((res) => res.json())
        .then((data) => setComments(Array.isArray(data) ? data : []))
        .catch(() => setComments([]));
    }
  }, [task?.id]);

  const handleAddComment = async () => {
    if (!task?.id || !newComment.trim()) return;
    setAddingComment(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments((prev) => [...prev, c]);
        setNewComment("");
      }
    } catch { /* ignore */ } finally {
      setAddingComment(false);
    }
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body = {
        title: trimmedTitle,
        description: description.trim(),
        status,
        priority,
        due_date: dueDate || null,
        project: project || null,
        ticket_ref: ticketRef || null,
        depends_on_shannon: dependsOnShannon,
        assigned_to_agent_id: assignedTo || null,
      };

      const res = isCreate
        ? await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/tasks/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestReview = async () => {
    if (!task?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/request-review`, { method: "POST" });
      if (res.ok) onSaved();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!task?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/approve`, { method: "POST" });
      if (res.ok) onSaved();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-800 rounded-lg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-100">
            {isCreate ? "Add Task" : "Edit Task"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Title">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="input-field" />
          </Field>

          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Task description" rows={3} className="input-field resize-none" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="input-field">
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="input-field">
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Assigned to">
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="input-field">
              <option value="">Me (Shannon)</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Due Date">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" />
            </Field>
            <Field label="Project">
              <input type="text" value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project name" className="input-field" />
            </Field>
          </div>

          <Field label="Ticket Ref">
            <input type="text" value={ticketRef} onChange={(e) => setTicketRef(e.target.value)} placeholder="e.g. GH-123" className="input-field" />
          </Field>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="depends-on-shannon" checked={dependsOnShannon} onChange={(e) => setDependsOnShannon(e.target.checked)} className="rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500" />
            <label htmlFor="depends-on-shannon" className="text-sm text-gray-300">Needs my approval</label>
          </div>

          {/* Review actions */}
          {!isCreate && (
            <div className="flex gap-2 pt-2">
              {task.status !== "review" && task.status !== "done" && (
                <button onClick={handleRequestReview} disabled={saving} className="px-3 py-1.5 text-xs font-mono bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 disabled:opacity-50">
                  Request Review
                </button>
              )}
              {(task.status === "review" || task.status === "quality_review") && (
                <button onClick={handleApprove} disabled={saving} className="px-3 py-1.5 text-xs font-mono bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 disabled:opacity-50">
                  Approve
                </button>
              )}
            </div>
          )}

          {/* Comments */}
          {!isCreate && (
            <div className="border-t border-gray-800 pt-4">
              <label className="block text-xs font-medium text-gray-400 mb-2">Comments</label>
              <div className="space-y-2 max-h-32 overflow-y-auto mb-2">
                {comments.map((c) => (
                  <div key={c.id} className="text-sm px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="text-xs text-gray-500 mb-1">
                      {c.author} &middot; {new Date(c.created_at).toLocaleString()}
                    </div>
                    <div className="text-gray-200 whitespace-pre-wrap">{c.content}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()} placeholder="Add a comment..." className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500" />
                <button type="button" onClick={handleAddComment} disabled={!newComment.trim() || addingComment} className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg disabled:opacity-50">
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 px-3 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors">
            {saving ? "Saving..." : isCreate ? "Add Task" : "Save"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: rgb(31, 41, 55);
          border: 1px solid rgb(55, 65, 81);
          border-radius: 0.5rem;
          color: rgb(243, 244, 246);
          font-size: 0.875rem;
        }
        .input-field:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgb(59, 130, 246);
          border-color: transparent;
        }
        .input-field::placeholder {
          color: rgb(107, 114, 128);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
