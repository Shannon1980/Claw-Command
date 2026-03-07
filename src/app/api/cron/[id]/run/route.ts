import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { emitNotification } from "@/lib/events/emitActivity";
import { computeNextRun } from "@/lib/cron/next-run";

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cron_jobs (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, schedule TEXT NOT NULL, action TEXT DEFAULT '{}',
      enabled BOOLEAN DEFAULT true, last_run_at TEXT, next_run_at TEXT, run_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (now()::text), updated_at TEXT NOT NULL DEFAULT (now()::text)
    );
    CREATE TABLE IF NOT EXISTS cron_runs (
      id TEXT PRIMARY KEY, job_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'running',
      result TEXT, error TEXT, started_at TEXT NOT NULL DEFAULT (now()::text), completed_at TEXT, duration_ms INTEGER
    );
  `);
  schemaReady = true;
}

function getBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000"
  );
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  try {
    await ensureSchema();
    const jobResult = await pool.query(`SELECT * FROM cron_jobs WHERE id = $1`, [id]);
    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: "Cron job not found" }, { status: 404 });
    }

    const job = jobResult.rows[0];
    const actionRaw = job.action ?? job.command;
    const action = typeof actionRaw === "string" ? (() => { try { return JSON.parse(actionRaw); } catch { return {}; } })() : (actionRaw ?? {});
    const { endpoint, method, payload } = action;

    // Record run start
    try {
      await pool.query(
        `INSERT INTO cron_runs (id, job_id, status, started_at) VALUES ($1, $2, 'running', $3)`,
        [runId, id, startedAt]
      );
    } catch {
      // table might not exist yet — non-critical
    }

    if (!endpoint) {
      const durationMs = Date.now() - startMs;
      try {
        await pool.query(
          `UPDATE cron_runs SET status = 'error', error = $1, completed_at = $2, duration_ms = $3 WHERE id = $4`,
          ["No endpoint configured in action", new Date().toISOString(), durationMs, runId]
        );
      } catch { /* */ }
      return NextResponse.json({ error: "Cron job has no endpoint in action" }, { status: 400 });
    }

    const baseUrl = getBaseUrl();
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && !endpoint.startsWith("http")) {
      headers["Authorization"] = `Bearer ${cronSecret}`;
    }
    const fetchOptions: RequestInit = {
      method: method || "POST",
      headers,
    };
    if (payload && method !== "GET") {
      fetchOptions.body = JSON.stringify(payload);
    }

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (fetchError) {
      const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      const durationMs = Date.now() - startMs;
      const now = new Date().toISOString();
      try {
        await pool.query(
          `UPDATE cron_runs SET status = 'error', error = $1, completed_at = $2, duration_ms = $3 WHERE id = $4`,
          [`Fetch failed: ${msg}`, now, durationMs, runId]
        );
      } catch { /* */ }
      return NextResponse.json({
        ok: false,
        runId,
        status: "error",
        durationMs,
        error: `Target request failed: ${msg}`,
        hint: "Check VERCEL_URL, NEXTAUTH_URL, or NEXT_PUBLIC_APP_URL for correct base URL",
      }, { status: 200 });
    }
    const result = await response.json().catch(() => ({ status: response.status }));
    const durationMs = Date.now() - startMs;
    const now = new Date().toISOString();

    // Update job with next_run_at
    const nextRun = computeNextRun(job.schedule, new Date(now));
    const nextRunIso = nextRun ? nextRun.toISOString() : null;
    await pool.query(
      `UPDATE cron_jobs SET last_run_at = $1, next_run_at = $2, run_count = run_count + 1, updated_at = $3 WHERE id = $4`,
      [now, nextRunIso, now, id]
    );

    // Record run result
    const runStatus = response.ok ? "success" : "error";
    try {
      await pool.query(
        `UPDATE cron_runs SET status = $1, result = $2, completed_at = $3, duration_ms = $4 WHERE id = $5`,
        [runStatus, JSON.stringify(result), now, durationMs, runId]
      );
    } catch { /* */ }

    emitNotification({ title: `Cron job "${job.name}" executed`, type: response.ok ? "info" : "warning" });
    return NextResponse.json({ ok: response.ok, runId, status: runStatus, durationMs, result });
  } catch (error) {
    const durationMs = Date.now() - startMs;
    const errorMsg = error instanceof Error ? error.message : String(error);

    try {
      await pool.query(
        `UPDATE cron_runs SET status = 'error', error = $1, completed_at = $2, duration_ms = $3 WHERE id = $4`,
        [errorMsg, new Date().toISOString(), durationMs, runId]
      );
    } catch { /* */ }

    console.error("[Cron Run API] error:", error);
    return NextResponse.json({ error: "Failed to run cron job", runId, status: "error" }, { status: 500 });
  }
}
