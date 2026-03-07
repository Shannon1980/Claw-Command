/**
 * Pipeline executor — runs pipeline steps sequentially.
 * Supports: spawn_agent, http_request, wait_for_task
 */

import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitPipelineProgress } from "@/lib/events/emitActivity";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

function getBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000"
  );
}

export interface PipelineStep {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
}

export interface ExecutorContext {
  pipelineId: string;
  runId: string;
  stepResults: Record<string, unknown>;
}

async function runSpawnAgent(
  step: PipelineStep,
  ctx: ExecutorContext
): Promise<Record<string, unknown>> {
  const cfg = step.config as { agent?: string; agentId?: string; task?: string };
  const agent = (cfg.agent ?? cfg.agentId ?? "") as string;
  const task = (cfg.task ?? "") as string;

  if (!agent) {
    throw new Error("spawn_agent step requires agent or agentId in config");
  }

  const baseUrl = getBaseUrl();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const mcKey = process.env.MC_API_KEY;
  if (mcKey) headers["Authorization"] = `Bearer ${mcKey}`;

  const res = await fetch(`${baseUrl}/api/mc/spawn`, {
    method: "POST",
    headers,
    body: JSON.stringify({ agent, task: task || `Task for ${agent}` }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    task_id?: string;
    success?: boolean;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error || `Spawn failed: ${res.status}`);
  }

  return { task_id: data.task_id, success: data.success };
}

async function runHttpRequest(
  step: PipelineStep,
  _ctx: ExecutorContext
): Promise<Record<string, unknown>> {
  const cfg = step.config as { url?: string; method?: string; body?: string };
  const url = (cfg.url ?? "") as string;

  if (!url) {
    throw new Error("http_request step requires url in config");
  }

  const fullUrl = url.startsWith("http") ? url : `${getBaseUrl()}${url.startsWith("/") ? "" : "/"}${url}`;
  const method = ((cfg.method as string) || "GET").toUpperCase();
  const body = cfg.body ? String(cfg.body) : undefined;

  const res = await fetch(fullUrl, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body && method !== "GET" ? body : undefined,
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }

  return { status: res.status, ok: res.ok, data: parsed };
}

async function runWaitForTask(
  step: PipelineStep,
  ctx: ExecutorContext,
  stepIndex: number,
  allSteps: PipelineStep[]
): Promise<Record<string, unknown>> {
  const cfg = step.config as { taskId?: string; fromStepIndex?: number; timeoutSeconds?: number };
  let taskId = (cfg.taskId ?? "") as string;

  if (!taskId && cfg.fromStepIndex != null && cfg.fromStepIndex >= 0 && cfg.fromStepIndex < allSteps.length) {
    const prevStep = allSteps[cfg.fromStepIndex];
    const prevResult = ctx.stepResults[prevStep.id];
    taskId = (prevResult as { task_id?: string } | undefined)?.task_id ?? "";
  }

  if (!taskId) {
    throw new Error("wait_for_task requires taskId or fromStepIndex pointing to a previous spawn_agent step");
  }

  const timeoutMs = ((cfg.timeoutSeconds ?? 300) as number) * 1000;
  const pollIntervalMs = 3000;
  const start = Date.now();

  const baseUrl = getBaseUrl();

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${baseUrl}/api/tasks/${taskId}`);
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      continue;
    }

    const task = (await res.json()) as { status?: string };
    if (task.status === "done") {
      return { completed: true, taskId, status: task.status };
    }
    if (["blocked", "cancelled"].includes(task.status ?? "")) {
      throw new Error(`Task ${taskId} ended with status: ${task.status}`);
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(`wait_for_task timed out after ${timeoutMs / 1000}s`);
}

async function executeStep(
  step: PipelineStep,
  ctx: ExecutorContext,
  stepIndex: number,
  allSteps: PipelineStep[]
): Promise<Record<string, unknown>> {
  switch (step.type) {
    case "spawn_agent":
      return runSpawnAgent(step, ctx);
    case "http_request":
      return runHttpRequest(step, ctx);
    case "wait_for_task":
      return runWaitForTask(step, ctx, stepIndex, allSteps);
    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

export async function executePipeline(
  pipelineId: string,
  runId: string,
  steps: PipelineStep[]
): Promise<void> {
  if (!pool) {
    throw new Error("No database connection");
  }

  const ctx: ExecutorContext = {
    pipelineId,
    runId,
    stepResults: {},
  };

  const now = () => new Date().toISOString();

  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepId = step.id || `step-${i}`;

      await pool.query(
        `UPDATE pipeline_runs SET current_step_index = $1, results = $2 WHERE id = $3`,
        [i, JSON.stringify(ctx.stepResults), runId]
      );

      emitPipelineProgress({
        pipelineId,
        runId,
        status: "running",
        currentStepIndex: i,
        currentStepLabel: step.label,
      });

      const result = await executeStep(step, ctx, i, steps);
      ctx.stepResults[stepId] = result;
    }

    await pool.query(
      `UPDATE pipeline_runs SET status = 'completed', completed_at = $1, current_step_index = $2, results = $3 WHERE id = $4`,
      [now(), steps.length, JSON.stringify(ctx.stepResults), runId]
    );

    emitPipelineProgress({
      pipelineId,
      runId,
      status: "completed",
      results: ctx.stepResults,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Pipeline Executor] Error:", err);

    try {
      await pool.query(
        `UPDATE pipeline_runs SET status = 'failed', completed_at = $1, results = $2 WHERE id = $3`,
        [now(), JSON.stringify({ ...ctx.stepResults, error: msg }), runId]
      );
    } catch {
      /* ignore */
    }

    emitPipelineProgress({
      pipelineId,
      runId,
      status: "failed",
      error: msg,
    });
  }
}
