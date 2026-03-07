"use client";

import { create } from "zustand";

export interface PipelineStep {
  id: string;
  type: "spawn_agent" | "wait_for_task" | "http_request" | "conditional" | "parallel";
  config: Record<string, unknown>;
  label: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  status: "draft" | "active" | "paused" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  currentStepIndex: number;
  startedAt: string;
  completedAt: string | null;
  results: Record<string, unknown>;
}

interface PipelineStore {
  pipelines: Pipeline[];
  runs: PipelineRun[];
  selectedPipelineId: string | null;
  loading: boolean;
  error: string | null;

  fetchPipelines: () => Promise<void>;
  fetchRuns: (pipelineId: string) => Promise<void>;
  selectPipeline: (id: string | null) => void;
  addPipeline: (pipeline: Pipeline) => void;
  updatePipeline: (id: string, updates: Partial<Pipeline>) => void;
  updateRun: (runId: string, updates: Partial<PipelineRun>) => void;
  handleSSEEvent: (data: Record<string, unknown>) => void;
}

export const usePipelineStore = create<PipelineStore>()((set, get) => ({
  pipelines: [],
  runs: [],
  selectedPipelineId: null,
  loading: false,
  error: null,

  fetchPipelines: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/pipelines");
      if (!res.ok) throw new Error("Failed to fetch pipelines");
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      set({
        pipelines: items.map((p: Pipeline & { steps?: string | PipelineStep[] }) => {
          let steps: PipelineStep[] = [];
          if (Array.isArray(p.steps)) steps = p.steps;
          else if (typeof p.steps === "string") {
            try {
              steps = JSON.parse(p.steps);
            } catch {
              steps = [];
            }
          }
          return { ...p, steps };
        }),
        loading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchRuns: async (pipelineId) => {
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/runs`);
      if (!res.ok) return;
      const data = await res.json();
      set({ runs: Array.isArray(data) ? data : [] });
    } catch { /* silent */ }
  },

  selectPipeline: (id) => set({ selectedPipelineId: id }),

  addPipeline: (pipeline) =>
    set((state) => ({
      pipelines: [...state.pipelines, pipeline],
    })),

  updatePipeline: (id, updates) =>
    set((state) => ({
      pipelines: state.pipelines.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  updateRun: (runId, updates) =>
    set((state) => ({
      runs: state.runs.map((r) =>
        r.id === runId ? { ...r, ...updates } : r
      ),
    })),

  handleSSEEvent: (data) => {
    const runId = data.runId as string;
    if (runId) {
      get().updateRun(runId, data as Partial<PipelineRun>);
    }
  },
}));
