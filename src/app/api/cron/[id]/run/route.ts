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

  try {
    const jobResult = await pool.query(`SELECT * FROM cron_jobs WHERE id = $1`, [id]);
    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: "Cron job not found" }, { status: 404 });
    }

    const job = jobResult.rows[0];
    const actionRaw = job.action ?? job.command;
    const action = typeof actionRaw === "string" ? (() => { try { return JSON.parse(actionRaw); } catch { return {}; } })() : (actionRaw ?? {});
    const { endpoint, method, payload } = action;

    if (!endpoint) {
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

    const now = new Date().toISOString();
    await pool.query(
      `UPDATE cron_jobs SET last_run_at = $1, run_count = run_count + 1, updated_at = $2 WHERE id = $3`,
      [now, now, id]
    );

    emitNotification({ title: "Cron job executed", type: "info" });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[Cron Run API] error:", error);
    return NextResponse.json({ error: "Failed to run cron job" }, { status: 500 });
  }
}
