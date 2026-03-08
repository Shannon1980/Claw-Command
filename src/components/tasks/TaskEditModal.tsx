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
  author_name?: string;
  author_emoji?: string;
  content: string;
  parent_comment_id?: string | null;
  created_at: string;
  replies?: TaskComment[];
}

interface LinkedDoc {
  id: string;
  title: string;
  type: string;
  status: string;
  agent: string;
  agentEmoji: string;
  reviewStatus: string;
  updatedAt: string;
}

interface AvailableDoc {
  id: string;
  title: string;
  type: string;
  agent: string;
  agentEmoji: string;
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

const REVIEW_STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-500/20 text-green-400",
  needs_changes: "bg-amber-500/20 text-amber-400",
  reviewed: "bg-blue-500/20 text-blue-400",
  rejected: "bg-red-500/20 text-red-400",
  pending_review: "bg-gray-700 text-gray-400",
};

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
  const [outcome, setOutcome] = useState(task?.outcome ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [linkedDocs, setLinkedDocs] = useState<LinkedDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);
  const [reviewingDocContent, setReviewingDocContent] = useState<string | null>(null);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<AvailableDoc[]>([]);
  const [loadingAvailableDocs, setLoadingAvailableDocs] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "documents" | "comments">("details");

  const showDocsSection = !isCreate && (status === "review" || status === "quality_review" || status === "done");

  useEffect(() => {
    if (task?.id) {
      fetch(`/api/tasks/${task.id}/comments`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load comments");
          return res.json();
        })
        .then((data) => setComments(Array.isArray(data) ? data : []))
        .catch(() => {
          setComments([]);
          setCommentError("Could not load comments");
        });
    }
  }, [task?.id]);

  useEffect(() => {
    if (task?.id && (status === "review" || status === "quality_review" || status === "done")) {
      setLoadingDocs(true);
      fetch(`/api/docs?linkedType=task&linkedId=${task.id}`)
        .then((res) => res.json())
        .then((data) => {
          const linked = Array.isArray(data) ? data : [];
          if (linked.length > 0) {
            setLinkedDocs(linked);
            setLoadingDocs(false);
          } else if (task.assignedToAgentId || task.agent_name) {
            return fetch(`/api/docs`)
              .then((res) => res.json())
              .then((allDocs) => {
                const agentId = task.assignedToAgentId;
                const agentName = task.agent_name;
                const agentDocs = (Array.isArray(allDocs) ? allDocs : []).filter(
                  (d: LinkedDoc & { authorAgentId?: string }) =>
                    (agentId && d.authorAgentId === agentId) ||
                    (agentName && d.agent === agentName)
                );
                setLinkedDocs(agentDocs);
                setLoadingDocs(false);
              });
          } else {
            setLinkedDocs([]);
            setLoadingDocs(false);
          }
        })
        .catch(() => {
          setLinkedDocs([]);
          setLoadingDocs(false);
        });
    }
  }, [task?.id, task?.assignedToAgentId, task?.agent_name, status]);

  const handleAddComment = async () => {
    if (!task?.id || !newComment.trim()) return;
    setAddingComment(true);
    setCommentError(null);
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
      } else {
        const data = await res.json().catch(() => ({}));
        setCommentError(data.error || `Failed to add comment (HTTP ${res.status})`);
      }
    } catch {
      setCommentError("Network error — could not add comment");
    } finally {
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
        outcome: outcome || null,
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

  const handleAssignDocAndReview = async (docIdToAssign: string) => {
    if (!task?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/assign-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: docIdToAssign, requestReview: true }),
      });
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

  const handleOpenDocPicker = async () => {
    setShowDocPicker(true);
    setLoadingAvailableDocs(true);
    try {
      const res = await fetch("/api/docs");
      const allDocs = await res.json();
      const docs = (Array.isArray(allDocs) ? allDocs : []).filter(
        (d: AvailableDoc) => !linkedDocs.some((ld) => ld.id === d.id)
      );
      setAvailableDocs(docs);
    } catch {
      setAvailableDocs([]);
    } finally {
      setLoadingAvailableDocs(false);
    }
  };

  const handleLinkDoc = async (doc: AvailableDoc) => {
    if (!task?.id) return;
    try {
      await fetch(`/api/docs/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedTo: [{ type: "task", id: task.id, name: task.title }],
        }),
      });
      setLinkedDocs((prev) => [
        ...prev,
        {
          id: doc.id,
          title: doc.title,
          type: doc.type,
          status: "draft",
          agent: doc.agent,
          agentEmoji: doc.agentEmoji,
          reviewStatus: "pending_review",
          updatedAt: new Date().toISOString(),
        },
      ]);
      setAvailableDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-800 rounded-lg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">
            {isCreate ? "Add Task" : "Edit Task"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        {!isCreate && (
          <div className="flex gap-1 mb-4 border-b border-gray-800 pb-1">
            <button
              onClick={() => setActiveTab("details")}
              className={`px-3 py-1.5 text-xs font-mono rounded-t transition-colors ${
                activeTab === "details"
                  ? "bg-gray-800 text-gray-100 border-b-2 border-blue-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`px-3 py-1.5 text-xs font-mono rounded-t transition-colors flex items-center gap-1.5 ${
                activeTab === "documents"
                  ? "bg-gray-800 text-gray-100 border-b-2 border-purple-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Documents
              {linkedDocs.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                  {linkedDocs.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              className={`px-3 py-1.5 text-xs font-mono rounded-t transition-colors flex items-center gap-1.5 ${
                activeTab === "comments"
                  ? "bg-gray-800 text-gray-100 border-b-2 border-cyan-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Comments
              {countAllComments(comments) > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                  {countAllComments(comments)}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Details Tab */}
        {(isCreate || activeTab === "details") && (
          <div className="space-y-4">
            <Field label="Title">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="input-field" />
            </Field>

            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Task description — what needs to be done and why" rows={3} className="input-field resize-none" />
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

            <Field label="Output / Deliverable">
              <textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Task output, deliverable link, or summary..." rows={2} className="input-field resize-none" />
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

            {/* Review status notice for review items */}
            {!isCreate && (status === "review" || status === "quality_review") && linkedDocs.length === 0 && !loadingDocs && (
              <div className="px-3 py-2 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                <p className="text-xs text-amber-400 font-medium">No deliverable attached</p>
                <p className="text-[11px] text-amber-400/70 mt-0.5">
                  Switch to the Documents tab to link a deliverable for review.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Documents Tab */}
        {!isCreate && activeTab === "documents" && (
          <div className="space-y-4">
            {/* Linked Documents */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-medium text-gray-400">
                  Linked Documents
                  {showDocsSection && (
                    <span className="ml-2 text-[10px] text-purple-400">(deliverables for review)</span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={handleOpenDocPicker}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded hover:bg-cyan-500/20 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Link Document
                </button>
              </div>

              {loadingDocs ? (
                <p className="text-xs text-gray-500 py-2">Loading documents...</p>
              ) : linkedDocs.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-gray-700 rounded-lg">
                  <svg className="w-8 h-8 mx-auto text-gray-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-xs text-gray-600">No documents linked to this task.</p>
                  {(status === "review" || status === "quality_review") && (
                    <p className="text-[11px] text-amber-500 mt-1">
                      Link a deliverable document for the reviewer.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedDocs.map((doc) => (
                    <div key={doc.id} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-200">{doc.agentEmoji} {doc.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          REVIEW_STATUS_COLORS[doc.reviewStatus] || REVIEW_STATUS_COLORS.pending_review
                        }`}>
                          {doc.reviewStatus?.replace(/_/g, " ") || "pending"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span>{doc.agent}</span>
                        <span>{doc.type}</span>
                        <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (reviewingDocId === doc.id) {
                            setReviewingDocId(null);
                            setReviewingDocContent(null);
                          } else {
                            setReviewingDocId(doc.id);
                            try {
                              const res = await fetch(`/api/docs?search=${encodeURIComponent(doc.title)}`);
                              const docs = await res.json();
                              const found = (Array.isArray(docs) ? docs : []).find((d: { id: string }) => d.id === doc.id);
                              setReviewingDocContent(found?.content || "No content available.");
                            } catch {
                              setReviewingDocContent("Failed to load document content.");
                            }
                          }
                        }}
                        className="mt-2 px-3 py-1 text-xs font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/30 transition-colors"
                      >
                        {reviewingDocId === doc.id ? "Hide" : "Review Document"}
                      </button>
                      {reviewingDocId === doc.id && reviewingDocContent !== null && (
                        <div className="mt-2 p-3 bg-gray-900 border border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{reviewingDocContent}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Picker */}
            {showDocPicker && (
              <div className="border border-gray-700 rounded-lg p-3 bg-gray-800/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-400">Select a document to link</span>
                  <button
                    type="button"
                    onClick={() => setShowDocPicker(false)}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    Close
                  </button>
                </div>
                {loadingAvailableDocs ? (
                  <p className="text-xs text-gray-500 py-2">Loading documents...</p>
                ) : availableDocs.length === 0 ? (
                  <p className="text-xs text-gray-600 py-2">No additional documents available to link.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {availableDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handleLinkDoc(doc)}
                          className="flex-1 text-left"
                        >
                          <span className="text-sm text-gray-200">{doc.agentEmoji} {doc.title}</span>
                          <div className="text-[10px] text-gray-500">{doc.agent} &middot; {doc.type}</div>
                        </button>
                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLinkDoc(doc)}
                            title="Link document"
                            className="p-1 text-gray-600 hover:text-cyan-400 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                          {status !== "review" && status !== "done" && (
                            <button
                              type="button"
                              onClick={() => handleAssignDocAndReview(doc.id)}
                              disabled={saving}
                              title="Link and request review"
                              className="px-1.5 py-0.5 text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                            >
                              + Review
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Output / Deliverable summary */}
            {outcome && (
              <div className="border-t border-gray-800 pt-3">
                <label className="block text-xs font-medium text-gray-400 mb-1">Deliverable Summary</label>
                <div className="px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-gray-300 whitespace-pre-wrap">
                  {outcome}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {!isCreate && activeTab === "comments" && (
          <div className="space-y-3">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {comments.length === 0 && !commentError && (
                <p className="text-xs text-gray-600 py-4 text-center">No comments yet.</p>
              )}
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} />
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} placeholder="Add a comment..." className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500" />
              <button type="button" onClick={handleAddComment} disabled={!newComment.trim() || addingComment} className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg disabled:opacity-50">
                {addingComment ? "Adding..." : "Add"}
              </button>
            </div>
            {commentError && (
              <div className="px-3 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-xs">
                {commentError}
              </div>
            )}
          </div>
        )}

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

function countAllComments(comments: TaskComment[]): number {
  return comments.reduce(
    (sum, c) => sum + 1 + (c.replies ? countAllComments(c.replies) : 0),
    0
  );
}

function CommentItem({ comment, depth = 0 }: { comment: TaskComment; depth?: number }) {
  return (
    <div style={depth > 0 ? { marginLeft: 16 } : undefined}>
      <div className="text-sm px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <div className="text-xs text-gray-500 mb-1">
          {comment.author_emoji ?? "👤"} {comment.author_name ?? comment.author} &middot; {new Date(comment.created_at).toLocaleString()}
        </div>
        <div className="text-gray-200 whitespace-pre-wrap">{comment.content}</div>
      </div>
      {comment.replies && comment.replies.length > 0 && depth < 5 && (
        <div className="mt-1 space-y-1 border-l border-gray-700 ml-2 pl-2">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
