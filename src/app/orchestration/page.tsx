"use client";

import { useEffect, useState } from "react";
import { usePipelineStore } from "@/lib/stores/pipelineStore";
import type { Pipeline, PipelineStep } from "@/lib/stores/pipelineStore";

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  running: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const stepTypes: PipelineStep["type"][] = [
  "spawn_agent",
  "wait_for_task",
  "http_request",
  "conditional",
  "parallel",
];

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

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    steps: [{ type: "spawn_agent" as PipelineStep["type"], label: "", config: "{}" }],
  });

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPipelines();
      if (selectedPipelineId) fetchRuns(selectedPipelineId);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchPipelines, fetchRuns, selectedPipelineId]);

  useEffect(() => {
    if (selectedPipelineId) {
      fetchRuns(selectedPipelineId);
    }
  }, [selectedPipelineId, fetchRuns]);

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { type: "spawn_agent", label: "", config: "{}" }],
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

  const handleCreate = async () => {
    setFormError(null);
    try {
      const steps = formData.steps.map((s, i) => {
        let parsedConfig;
        try {
          parsedConfig = JSON.parse(s.config);
        } catch {
          throw new Error(`Invalid JSON in step ${i + 1} config`);
        }
        return {
          id: `step-${Date.now()}-${i}`,
          type: s.type,
          label: s.label || `Step ${i + 1}`,
          config: parsedConfig,
        };
      });

      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          steps,
        }),
      });
      if (!res.ok) throw new Error("Failed to create pipeline");
      setShowForm(false);
      setFormData({ name: "", description: "", steps: [{ type: "spawn_agent", label: "", config: "{}" }] });
      fetchPipelines();
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const handleRun = async (id: string) => {
    try {
      await fetch(`/api/pipelines/${id}/run`, { method: "POST" });
      fetchRuns(id);
    } catch {
      // silent
    }
  };

  const selected = pipelines.find((p) => p.id === selectedPipelineId);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Orchestration</h1>
            <p className="text-xs text-gray-500 font-mono">Pipeline management and execution</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            {showForm ? "Cancel" : "Create Pipeline"}
          </button>
        </div>

        {(error || formError) && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error || formError}
          </div>
        )}

        {showForm && (
          <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-medium text-gray-300">Create Pipeline</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 font-mono mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-mono mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-500 font-mono">Steps</label>
                <button
                  onClick={addStep}
                  className="px-2 py-1 text-[11px] font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors"
                >
                  + Add Step
                </button>
              </div>
              <div className="space-y-2">
                {formData.steps.map((step, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <select
                      value={step.type}
                      onChange={(e) => updateStep(i, "type", e.target.value)}
                      className="px-2 py-1.5 text-xs bg-gray-950 border border-gray-700 rounded-lg text-gray-100"
                    >
                      {stepTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Label"
                      value={step.label}
                      onChange={(e) => updateStep(i, "label", e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs bg-gray-950 border border-gray-700 rounded-lg text-gray-100"
                    />
                    <textarea
                      value={step.config}
                      onChange={(e) => updateStep(i, "config", e.target.value)}
                      rows={1}
                      placeholder="Config JSON"
                      className="flex-1 px-2 py-1.5 text-xs bg-gray-950 border border-gray-700 rounded-lg text-gray-100 font-mono"
                    />
                    <button
                      onClick={() => removeStep(i)}
                      className="px-2 py-1.5 text-[11px] text-red-400 hover:text-red-300"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
            >
              Create
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline list */}
          <div className="lg:col-span-1">
            {loading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : pipelines.length === 0 ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-500">No pipelines yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pipelines.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => selectPipeline(selectedPipelineId === p.id ? null : p.id)}
                    className={`bg-gray-900/50 border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedPipelineId === p.id
                        ? "border-blue-500/50"
                        : "border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-200">{p.name}</span>
                      <span className={`px-2 py-0.5 text-[11px] font-mono rounded border ${statusColors[p.status] || statusColors.draft}`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{p.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-gray-600 font-mono">{p.steps?.length || 0} steps</span>
                      <span className="text-[11px] text-gray-600 font-mono">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline detail */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-gray-200">{selected.name}</h2>
                  {selected.status === "active" && (
                    <button
                      onClick={() => handleRun(selected.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-500 rounded transition-colors"
                    >
                      Run
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400">{selected.description}</p>

                <div>
                  <h3 className="text-xs text-gray-500 font-mono mb-2">Steps</h3>
                  <div className="space-y-1">
                    {(selected.steps || []).map((step, i) => (
                      <div key={step.id || i} className="flex items-center gap-2 px-3 py-2 bg-gray-950/50 rounded">
                        <span className="text-[11px] text-gray-600 font-mono w-6">{i + 1}.</span>
                        <span className="px-1.5 py-0.5 text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                          {step.type}
                        </span>
                        <span className="text-xs text-gray-300">{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Runs */}
                <div>
                  <h3 className="text-xs text-gray-500 font-mono mb-2">Runs</h3>
                  {runs.length === 0 ? (
                    <p className="text-xs text-gray-600">No runs yet</p>
                  ) : (
                    <div className="bg-gray-950/50 border border-gray-800 rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="text-left px-3 py-2 text-gray-500 font-mono font-normal">Status</th>
                            <th className="text-left px-3 py-2 text-gray-500 font-mono font-normal">Started</th>
                            <th className="text-left px-3 py-2 text-gray-500 font-mono font-normal">Completed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runs.map((run) => (
                            <tr key={run.id} className="border-b border-gray-800/50">
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 text-[11px] font-mono rounded border ${statusColors[run.status] || statusColors.draft}`}>
                                  {run.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-400 font-mono">
                                {new Date(run.startedAt).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-gray-400 font-mono">
                                {run.completedAt ? new Date(run.completedAt).toLocaleString() : "-"}
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
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
                <p className="text-sm text-gray-500">Select a pipeline to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
