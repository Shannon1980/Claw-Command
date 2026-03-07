"use client";

import { useEffect, useState } from "react";
import { usePipelineStore } from "@/lib/stores/pipelineStore";
import type { Pipeline, PipelineStep } from "@/lib/stores/pipelineStore";

const STEP_TYPES = [
  { value: "spawn_agent", label: "Assign task to agent", description: "Create a task and assign it to an agent" },
  { value: "http_request", label: "Call a URL", description: "Make an HTTP request to any endpoint" },
  { value: "wait_for_task", label: "Wait for task", description: "Pause until a task is completed" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  running: "Running",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  running: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

interface AgentOption {
  id: string;
  name: string;
  emoji: string;
}

export default function OrchestrationPage() {
  const {
    pipelines,
    runs,
    selectedPipelineId,
    loading,
    error,
    fetchPipelines,
    fetchRuns,
    selectPipeline,
  } = usePipelineStore();

  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    steps: [
      {
        type: "spawn_agent" as PipelineStep["type"],
        label: "Step 1",
        agent: "",
        task: "",
        url: "",
        method: "GET",
        taskId: "",
        fromStep: "",
        timeoutSeconds: "300",
      },
    ],
  });

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => setAgents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  useEffect(() => {
    if (selectedPipelineId) fetchRuns(selectedPipelineId);
  }, [selectedPipelineId, fetchRuns]);

  // Poll more frequently when a run is in progress
  const hasRunningRun = runs.some((r) => r.status === "running");
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPipelines();
      if (selectedPipelineId) fetchRuns(selectedPipelineId);
    }, hasRunningRun ? 2000 : 15000);
    return () => clearInterval(interval);
  }, [fetchPipelines, fetchRuns, selectedPipelineId, hasRunningRun]);

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          type: "spawn_agent",
          label: `Step ${formData.steps.length + 1}`,
          agent: "",
          task: "",
          url: "",
          method: "GET",
          taskId: "",
          fromStep: "",
          timeoutSeconds: "300",
        },
      ],
    });
  };

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  const updateStep = (index: number, field: string, value: string) => {
    const steps = [...formData.steps];
    steps[index] = { ...steps[index], [field]: value };
    setFormData({ ...formData, steps });
  };

  const buildStepConfig = (step: (typeof formData.steps)[0]): Record<string, unknown> => {
    switch (step.type) {
      case "spawn_agent":
        return { agent: step.agent, task: step.task };
      case "http_request":
        return { url: step.url, method: step.method };
      case "wait_for_task":
        return {
          taskId: step.taskId || undefined,
          fromStepIndex: step.fromStep !== "" ? parseInt(step.fromStep, 10) : undefined,
          timeoutSeconds: parseInt(step.timeoutSeconds, 10) || 300,
        };
      default:
        return {};
    }
  };

  const handleCreate = async () => {
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError("Please enter a pipeline name");
      return;
    }
    try {
      const steps: PipelineStep[] = formData.steps.map((s, i) => ({
        id: `step-${Date.now()}-${i}`,
        type: s.type,
        label: s.label || `Step ${i + 1}`,
        config: buildStepConfig(s),
      }));

      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          steps,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to create pipeline");
      }
      setShowForm(false);
      setFormData({
        name: "",
        description: "",
        steps: [
          {
            type: "spawn_agent",
            label: "Step 1",
            agent: "",
            task: "",
            url: "",
            method: "GET",
            taskId: "",
            fromStep: "",
            timeoutSeconds: "300",
          },
        ],
      });
      fetchPipelines();
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const handleActivate = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/pipelines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: active ? "active" : "draft" }),
      });
      if (res.ok) fetchPipelines();
    } catch {
      // silent
    }
  };

  const handleRun = async (id: string) => {
    setFormError(null);
    try {
      const res = await fetch(`/api/pipelines/${id}/run`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to run");
      }
      fetchRuns(id);
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const selected = pipelines.find((p) => p.id === selectedPipelineId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Pipelines</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Create workflows that assign tasks to agents, call APIs, and wait for completion
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 text-sm font-medium rounded-lg transition-colors bg-blue-600 hover:bg-blue-500 text-white"
          >
            {showForm ? "Cancel" : "New pipeline"}
          </button>
        </div>

        {(error || formError) && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error || formError}
          </div>
        )}

        {showForm && (
          <div className="mb-8 rounded-xl bg-slate-900/60 border border-slate-700/50 p-6 space-y-6">
            <h2 className="text-lg font-medium text-slate-200">Create pipeline</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Weekly report workflow"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-600 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Description (optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this pipeline do?"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-600 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-400">Steps</label>
                <button
                  onClick={addStep}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors"
                >
                  + Add step
                </button>
              </div>
              <div className="space-y-4">
                {formData.steps.map((step, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-slate-950/80 border border-slate-700/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">Step {i + 1}</span>
                      <button
                        onClick={() => removeStep(i)}
                        className="text-slate-500 hover:text-red-400 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Action</label>
                      <select
                        value={step.type}
                        onChange={(e) => updateStep(i, "type", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">{STEP_TYPES.find((t) => t.value === step.type)?.description}</p>
                    </div>

                    {step.type === "spawn_agent" && (
                      <>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Agent</label>
                          <select
                            value={step.agent}
                            onChange={(e) => updateStep(i, "agent", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                          >
                            <option value="">Select an agent</option>
                            {agents.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.emoji} {a.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Task description</label>
                          <input
                            type="text"
                            value={step.task}
                            onChange={(e) => updateStep(i, "task", e.target.value)}
                            placeholder="e.g. Draft the weekly status report"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500"
                          />
                        </div>
                      </>
                    )}

                    {step.type === "http_request" && (
                      <>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">URL</label>
                          <input
                            type="text"
                            value={step.url}
                            onChange={(e) => updateStep(i, "url", e.target.value)}
                            placeholder="https://example.com/api or /api/tasks/sync"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 font-mono text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Method</label>
                          <select
                            value={step.method}
                            onChange={(e) => updateStep(i, "method", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                          </select>
                        </div>
                      </>
                    )}

                    {step.type === "wait_for_task" && (
                      <>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Wait for task from step</label>
                          <select
                            value={step.fromStep}
                            onChange={(e) => updateStep(i, "fromStep", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                          >
                            <option value="">— Select a previous step —</option>
                            {formData.steps.slice(0, i).map((s, idx) => {
                              const isSpawn = s.type === "spawn_agent";
                              return (
                                <option key={idx} value={String(idx)} disabled={!isSpawn}>
                                  Step {idx + 1}: {isSpawn ? `${s.agent || "agent"} – ${s.task || "task"}` : s.type}
                                </option>
                              );
                            })}
                          </select>
                          <p className="text-xs text-slate-500 mt-1">Only &quot;Assign task to agent&quot; steps create tasks</p>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Or enter task ID directly (optional)</label>
                          <input
                            type="text"
                            value={step.taskId}
                            onChange={(e) => updateStep(i, "taskId", e.target.value)}
                            placeholder="task-123..."
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 font-mono text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Timeout (seconds)</label>
                          <input
                            type="number"
                            value={step.timeoutSeconds}
                            onChange={(e) => updateStep(i, "timeoutSeconds", e.target.value)}
                            min="10"
                            max="3600"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Step label (for display)</label>
                      <input
                        type="text"
                        value={step.label}
                        onChange={(e) => updateStep(i, "label", e.target.value)}
                        placeholder={`Step ${i + 1}`}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="px-5 py-2.5 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              Create pipeline
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Your pipelines</h3>
            {loading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : pipelines.length === 0 ? (
              <div className="rounded-xl bg-slate-900/50 border border-slate-700/50 p-8 text-center">
                <p className="text-slate-500">No pipelines yet</p>
                <p className="text-sm text-slate-600 mt-1">Create one to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pipelines.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => selectPipeline(selectedPipelineId === p.id ? null : p.id)}
                    className={`rounded-xl p-4 cursor-pointer transition-colors border ${
                      selectedPipelineId === p.id
                        ? "bg-slate-800/60 border-blue-500/50"
                        : "bg-slate-900/50 border-slate-700/50 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-200">{p.name}</span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                          STATUS_STYLES[p.status] ?? STATUS_STYLES.draft
                        }`}
                      >
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{p.description || "No description"}</p>
                    <p className="text-xs text-slate-600 mt-2">{p.steps?.length ?? 0} steps</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <div className="rounded-xl bg-slate-900/50 border border-slate-700/50 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-100">{selected.name}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{selected.description || "No description"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleActivate(selected.id, selected.status !== "active")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        selected.status === "active"
                          ? "bg-slate-600/50 text-slate-400 hover:bg-slate-600"
                          : "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40"
                      }`}
                    >
                      {selected.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    {selected.status === "active" && (
                      <button
                        onClick={() => handleRun(selected.id)}
                        className="px-4 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      >
                        Run
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Steps</h3>
                  <div className="space-y-2">
                    {(selected.steps || []).map((step, i) => (
                      <div
                        key={step.id || i}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-950/60 border border-slate-700/30"
                      >
                        <span className="text-slate-500 font-medium w-6">{i + 1}.</span>
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {STEP_TYPES.find((t) => t.value === step.type)?.label ?? step.type}
                        </span>
                        <span className="text-slate-300">{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Run history</h3>
                  {runs.length === 0 ? (
                    <p className="text-sm text-slate-500">No runs yet. Activate and run to see history.</p>
                  ) : (
                    <div className="rounded-lg border border-slate-700/50 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-900/80 border-b border-slate-700">
                            <th className="text-left px-4 py-3 text-slate-500 font-normal">Status</th>
                            <th className="text-left px-4 py-3 text-slate-500 font-normal">Started</th>
                            <th className="text-left px-4 py-3 text-slate-500 font-normal">Completed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runs.map((run) => (
                            <tr key={run.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${
                                    STATUS_STYLES[run.status] ?? STATUS_STYLES.draft
                                  }`}
                                >
                                  {run.status === "running" && "currentStepIndex" in run && run.currentStepIndex != null
                                    ? `Step ${(run.currentStepIndex as number) + 1} of ${selected.steps?.length ?? 0}`
                                    : STATUS_LABELS[run.status] ?? run.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-400">
                                {new Date(run.startedAt).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-slate-400">
                                {run.completedAt ? new Date(run.completedAt).toLocaleString() : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-900/50 border border-slate-700/50 p-12 text-center">
                <p className="text-slate-500">Select a pipeline to view details and run it</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
