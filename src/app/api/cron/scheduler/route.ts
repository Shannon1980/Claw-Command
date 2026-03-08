import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { isDue, computeNextRun } from "@/lib/cron/next-run";

function getBaseUrl(): string {
  const url =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!url) {
    console.warn("[Cron Scheduler] No base URL configured (NEXTAUTH_URL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_BASE_URL, or VERCEL_URL). Falling back to http://localhost:3000 — cron jobs calling internal endpoints will fail in production.");
  }
  return url || "http://localhost:3000";
}

/**
 * Cron scheduler: called every minute by Vercel Cron.
 * Checks all enabled cron_jobs, triggers any that are due.
 */
async function runScheduler(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  const now = new Date();
  const triggered: string[] = [];
  const errors: string[] = [];

  try {
    // Ensure tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cron_jobs (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, schedule TEXT NOT NULL, action TEXT DEFAULT '{}',
        enabled BOOLEAN DEFAULT true, last_run_at TEXT, next_run_at TEXT, run_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (now()::text), updated_at TEXT NOT NULL DEFAULT (now()::text)
      );
      ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS action TEXT;
      ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS next_run_at TEXT;
      CREATE TABLE IF NOT EXISTS cron_runs (
        id TEXT PRIMARY KEY, job_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'running',
        result TEXT, error TEXT, started_at TEXT NOT NULL DEFAULT (now()::text), completed_at TEXT, duration_ms INTEGER
      );
    `);

    const jobsResult = await pool.query(
      `SELECT * FROM cron_jobs WHERE enabled = true`
    );

    // Collect due jobs first, then run them in parallel to avoid timeouts
    const dueJobs: Array<{ job: typeof jobsResult.rows[0]; endpoint: string; method: string; payload: unknown }> = [];

    for (const job of jobsResult.rows) {
      const schedule = job.schedule as string;
      const nextRunAt = (job.next_run_at as string) || null;

      if (!isDue(schedule, nextRunAt, now)) {
        continue;
      }

      const actionRaw = job.action ?? job.command;
      const action =
        typeof actionRaw === "string"
          ? (() => {
              try {
                return JSON.parse(actionRaw);
              } catch {
                return {};
              }
            })()
          : actionRaw ?? {};
      const { endpoint, method, payload } = action;

      if (!endpoint) {
        errors.push(`${job.name}: no endpoint configured`);
        continue;
      }

      dueJobs.push({ job, endpoint, method: method || "POST", payload });
    }

    const baseUrl = getBaseUrl();

    // Execute all due jobs in parallel
    await Promise.all(dueJobs.map(async ({ job, endpoint, method, payload }) => {
      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const startedAt = now.toISOString();
      const startMs = Date.now();

      try {
        await pool!.query(
          `INSERT INTO cron_runs (id, job_id, status, started_at) VALUES ($1, $2, 'running', $3)`,
          [runId, job.id, startedAt]
        );
      } catch {
        // non-critical
      }

      const url = endpoint.startsWith("http")
        ? endpoint
        : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (cronSecret && !endpoint.startsWith("http")) {
        headers["Authorization"] = `Bearer ${cronSecret}`;
      }

      const fetchOptions: RequestInit = { method, headers };
      if (payload && method !== "GET") {
        fetchOptions.body = JSON.stringify(payload);
      }

      let runStatus = "error";
      let resultData: unknown = null;
      try {
        const response = await fetch(url, fetchOptions);
        resultData = await response.json().catch(() => ({ status: response.status }));
        runStatus = response.ok ? "success" : "error";
        if (!response.ok) {
          errors.push(`${job.name}: HTTP ${response.status}`);
        }
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        errors.push(`${job.name}: fetch failed - ${msg}`);
        resultData = { error: msg };
      }

      const durationMs = Date.now() - startMs;
      const completedAt = new Date().toISOString();

      // Calculate next run time
      const schedule = job.schedule as string;
      const nextRun = computeNextRun(schedule, now);
      const nextRunIso = nextRun ? nextRun.toISOString() : null;

      // Update job
      await pool!.query(
        `UPDATE cron_jobs SET last_run_at = $1, next_run_at = $2, run_count = run_count + 1, updated_at = $3 WHERE id = $4`,
        [completedAt, nextRunIso, completedAt, job.id]
      );

      // Update run record
      try {
        await pool!.query(
          `UPDATE cron_runs SET status = $1, result = $2, completed_at = $3, duration_ms = $4 WHERE id = $5`,
          [runStatus, JSON.stringify(resultData), completedAt, durationMs, runId]
        );
      } catch {
        // non-critical
      }

      triggered.push(job.name);
    }));

    return NextResponse.json({
      ok: true,
      checked: jobsResult.rows.length,
      triggered,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[Cron Scheduler] Error:", error);
    return NextResponse.json(
      { error: "Scheduler failed", details: String(error) },
      { status: 500 }
    );
  }
}

/** GET - Vercel Cron calls GET */
export async function GET(request: NextRequest) {
  return runScheduler(request);
}

/** POST - manual trigger */
export async function POST(request: NextRequest) {
  return runScheduler(request);
}
