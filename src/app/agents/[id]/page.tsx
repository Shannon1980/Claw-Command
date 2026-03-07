"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ChatWindow from "@/components/chat/ChatWindow";
import type { Task, TaskStatus } from "@/lib/stores/taskStore";

interface AgentDetail {
  id: string;
  name: string;
  emoji: string;
  domain: string;
  status: string;
  capabilities: string | null;
  soul: string | null;
  updated_at: string;
}

function heartbeatColor(updatedAt: string): string {
  const diff = (Date.now() - new Date(updatedAt).getTime()) / 1000;
  if (diff < 60) return "bg-green-500";
  if (diff < 300) return "bg-yellow-500";
  return "bg-red-500";
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    blocked: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    idle: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    waiting_for_shannon: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };
  return colors[status] || colors.idle;
}

function taskStatusColor(status: string) {
  const colors: Record<string, string> = {
    in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    backlog: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    blocked: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    review: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    quality_review: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    done: "bg-green-500/20 text-green-400 border-green-500/30",
    inbox: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return colors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

type Tab = "tasks" | "chat";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("tasks");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);
  const [outcomeEditing, setOutcomeEditing] = useState<string | null>(null);
  const [outcomeText, setOutcomeText] = useState("");

  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      const found = rows.find(
        (r: Record<string, unknown>) => r.id === agentId
      );
      if (found) setAgent(found as AgentDetail);
    } catch {
      // silent
    }
  }, [agentId]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?agent=${agentId}`);
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      const mapped: Task[] = rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        title: r.title as string,
        description: (r.description as string) || "",
        assignedToAgentId: (r.assigned_to_agent_id ?? null) as string | null,
        dependsOnShannon: (r.depends_on_shannon ?? false) as boolean,
        status: (r.status as TaskStatus) || "backlog",
        priority: ((r.priority as string) || "medium") as Task["priority"],
        dueDate: (r.due_date ?? null) as string | null,
        outcome: (r.outcome as string) || null,
        project: (r.project as string) || null,
        ticketRef: (r.ticket_ref ?? null) as string | null,
        createdAt: (r.created_at as string) || new Date().toISOString(),
        updatedAt: (r.updated_at as string) || new Date().toISOString(),
        agent_name: (r.agent_name as string) || "Shannon",
        agent_emoji: (r.agent_emoji as string) || "",
        comment_count: Number(r.comment_count ?? 0),
      }));
      setTasks(mapped);
    } catch {
      // silent
    }
  }, [agentId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAgent(), fetchTasks()]).finally(() => setLoading(false));
    const interval = setInterval(() => {
      fetchAgent();
      fetchTasks();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchAgent, fetchTasks]);

  const handleApprove = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      await fetch(`/api/tasks/${taskId}/approve`, { method: "POST" });
      await fetchTasks();
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      await fetch(`/api/tasks/${taskId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      setShowRejectInput(null);
      setRejectReason("");
      await fetchTasks();
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveOutcome = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome: outcomeText }),
      });
      setOutcomeEditing(null);
      setOutcomeText("");
      await fetchTasks();
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        Loading agent...
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Agent not found</p>
          <button
            onClick={() => router.push("/agents")}
            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
          >
            Back to Agents
          </button>
        </div>
      </div>
    );
  }

  const reviewTasks = tasks.filter(
    (t) => t.status === "review" || t.status === "quality_review"
  );
  const activeTasks = tasks.filter(
    (t) => t.status === "in_progress" || t.status === "blocked"
  );
  const doneTasks = tasks.filter((t) => t.status === "done");
  const otherTasks = tasks.filter(
    (t) =>
      !["review", "quality_review", "in_progress", "blocked", "done"].includes(
        t.status
      )
  );

  const renderTaskGroup = (label: string, groupTasks: Task[], highlight?: string) => {
    if (groupTasks.length === 0) return null;
    return (
      <div className="mb-4">
        <h3
          className={`text-xs font-mono font-bold uppercase tracking-wider mb-2 ${
            highlight || "text-gray-500"
          }`}
        >
          {label} ({groupTasks.length})
        </h3>
        <div className="space-y-2">
          {groupTasks.map((task) => (
            <div
              key={task.id}
              className="bg-gray-900/80 border border-gray-800 rounded-lg overflow-hidden"
            >
              <div
                className="p-3 cursor-pointer hover:bg-gray-800/30 transition-colors"
                onClick={() =>
                  setExpandedTask(expandedTask === task.id ? null : task.id)
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-gray-200 leading-tight flex-1">
                    {task.title}
                  </h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {task.priority !== "medium" && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                          task.priority === "high"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {task.priority}
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${taskStatusColor(
                        task.status
                      )}`}
                    >
                      {task.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                {task.outcome && (
                  <div className="mt-2 px-2 py-1.5 bg-green-500/5 border border-green-500/20 rounded text-xs text-green-300">
                    <span className="font-mono text-green-500 text-[10px]">
                      OUTPUT:{" "}
                    </span>
                    {task.outcome}
                  </div>
                )}
                {task.dependsOnShannon && task.status !== "done" && (
                  <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Needs your approval
                  </span>
                )}
              </div>

              {expandedTask === task.id && (
                <div className="border-t border-gray-800 p-3 space-y-3">
                  {task.description && (
                    <div>
                      <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">
                        Description
                      </p>
                      <p className="text-xs text-gray-300 whitespace-pre-wrap">
                        {task.description}
                      </p>
                    </div>
                  )}

                  {/* Outcome display/edit */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-gray-500 font-mono uppercase">
                        Output / Deliverable
                      </p>
                      {outcomeEditing !== task.id && (
                        <button
                          onClick={() => {
                            setOutcomeEditing(task.id);
                            setOutcomeText(task.outcome || "");
                          }}
                          className="text-[10px] text-blue-400 hover:text-blue-300"
                        >
                          {task.outcome ? "Edit" : "Add output"}
                        </button>
                      )}
                    </div>
                    {outcomeEditing === task.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={outcomeText}
                          onChange={(e) => setOutcomeText(e.target.value)}
                          rows={3}
                          placeholder="Describe the output, paste a link, or summarize the deliverable..."
                          className="w-full px-3 py-2 text-xs bg-gray-950 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-600 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveOutcome(task.id)}
                            disabled={actionLoading === task.id}
                            className="px-2 py-1 text-[11px] font-mono bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setOutcomeEditing(null);
                              setOutcomeText("");
                            }}
                            className="px-2 py-1 text-[11px] font-mono text-gray-500 hover:text-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : task.outcome ? (
                      <p className="text-xs text-gray-300 whitespace-pre-wrap bg-gray-950/50 border border-gray-800 rounded p-2">
                        {task.outcome}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600 italic">
                        No output recorded yet
                      </p>
                    )}
                  </div>

                  {task.dueDate && (
                    <div>
                      <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">
                        Due Date
                      </p>
                      <p className="text-xs text-gray-300">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {task.project && (
                    <div>
                      <p className="text-[10px] text-gray-500 font-mono uppercase mb-1">
                        Project
                      </p>
                      <p className="text-xs text-cyan-400">{task.project}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                    {(task.status === "review" ||
                      task.status === "quality_review") && (
                      <>
                        <button
                          onClick={() => handleApprove(task.id)}
                          disabled={actionLoading === task.id}
                          className="px-3 py-1.5 text-xs font-mono bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 disabled:opacity-50"
                        >
                          {actionLoading === task.id
                            ? "..."
                            : "Approve"}
                        </button>
                        {showRejectInput === task.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason (optional)"
                              className="flex-1 px-2 py-1 text-xs bg-gray-950 border border-gray-700 rounded text-gray-100 placeholder-gray-600"
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleReject(task.id)
                              }
                            />
                            <button
                              onClick={() => handleReject(task.id)}
                              disabled={actionLoading === task.id}
                              className="px-2 py-1 text-xs font-mono bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => {
                                setShowRejectInput(null);
                                setRejectReason("");
                              }}
                              className="text-xs text-gray-500 hover:text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowRejectInput(task.id)}
                            className="px-3 py-1.5 text-xs font-mono bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                          >
                            Reject
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => router.push("/tasks")}
                      className="px-3 py-1.5 text-xs font-mono text-gray-500 hover:text-gray-300 ml-auto"
                    >
                      View in Kanban
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/agents")}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="text-2xl">{agent.emoji}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-100">{agent.name}</h1>
              <span
                className={`w-2 h-2 rounded-full ${heartbeatColor(
                  agent.updated_at
                )}`}
              />
              <span
                className={`px-2 py-0.5 text-[11px] font-mono rounded border ${statusBadge(
                  agent.status
                )}`}
              >
                {agent.status.replace(/_/g, " ")}
              </span>
              <span className="px-1.5 py-0.5 text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                {agent.domain}
              </span>
            </div>
            {agent.capabilities && (
              <p className="text-xs text-gray-500 mt-0.5">
                {agent.capabilities}
              </p>
            )}
          </div>
          <div className="text-[11px] text-gray-600 font-mono">
            Last heartbeat: {new Date(agent.updated_at).toLocaleString()}
          </div>
        </div>

        {/* Review alert banner */}
        {reviewTasks.length > 0 && (
          <div className="mb-4 px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-purple-400 font-mono text-xs font-bold">
                REVIEW NEEDED
              </span>
              <span className="text-xs text-gray-400">
                {reviewTasks.length} task
                {reviewTasks.length !== 1 ? "s" : ""} waiting for your review
              </span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-gray-800">
          <button
            onClick={() => setTab("tasks")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "tasks"
                ? "border-blue-500 text-gray-100"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            Tasks
            {tasks.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-gray-800 rounded">
                {tasks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("chat")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "chat"
                ? "border-blue-500 text-gray-100"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            Chat
          </button>
        </div>

        {/* Tab content */}
        {tab === "tasks" && (
          <div>
            {tasks.length === 0 ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
                <p className="text-sm text-gray-500">
                  No tasks assigned to this agent.
                </p>
              </div>
            ) : (
              <>
                {renderTaskGroup(
                  "Needs Review",
                  reviewTasks,
                  "text-purple-400"
                )}
                {renderTaskGroup("Active", activeTasks, "text-blue-400")}
                {renderTaskGroup("Backlog", otherTasks)}
                {renderTaskGroup("Completed", doneTasks, "text-green-400")}
              </>
            )}
          </div>
        )}

        {tab === "chat" && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden h-[600px]">
            <ChatWindow
              agentId={agent.id}
              agentName={agent.name}
              agentEmoji={agent.emoji}
            />
          </div>
        )}
      </div>
    </div>
  );
}
