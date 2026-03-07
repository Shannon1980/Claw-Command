import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitNotification } from "@/lib/events/emitActivity";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

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

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

    const fetchOptions: RequestInit = {
      method: method || "POST",
      headers: { "Content-Type": "application/json" },
    };
    if (payload && method !== "GET") {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(url, fetchOptions);
    const result = await response.json().catch(() => ({ status: response.status }));
    const durationMs = Date.now() - startMs;
    const now = new Date().toISOString();

    // Update job
    await pool.query(
      `UPDATE cron_jobs SET last_run_at = $1, run_count = run_count + 1, updated_at = $2 WHERE id = $3`,
      [now, now, id]
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
