import { NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

const SAMPLE_LOGS = [
  { id: "log-seed-1", agent_id: "bob", session_id: "sess-001", level: "info", message: "Orchestration cycle started" },
  { id: "log-seed-2", agent_id: "bertha", session_id: "sess-002", level: "info", message: "Drafting DHS Border Tech capability statement" },
  { id: "log-seed-3", agent_id: "veronica", session_id: "sess-003", level: "warn", message: "MBE docs pending Shannon approval" },
  { id: "log-seed-4", agent_id: "forge", session_id: "sess-004", level: "info", message: "GovForecast data pipeline architecture in progress" },
  { id: "log-seed-5", agent_id: "depa", session_id: "sess-005", level: "debug", message: "Intel aggregation complete for Army NETCOM" },
  { id: "log-seed-6", agent_id: "skylar", session_id: "sess-006", level: "info", message: "SEAS IT quarterly status report drafted" },
  { id: "log-seed-7", agent_id: "bertha", session_id: "sess-002", level: "error", message: "VA proposal pricing lookup failed - retrying" },
  { id: "log-seed-8", agent_id: "forge", session_id: "sess-004", level: "info", message: "NoteTaker AI beta testing plan created" },
  { id: "log-seed-9", agent_id: "bob", session_id: "sess-001", level: "info", message: "Task assignments distributed to 4 agents" },
  { id: "log-seed-10", agent_id: "peter", session_id: "sess-007", level: "info", message: "Sprint backlog updated" },
];

export async function POST() {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const now = new Date().toISOString();
    for (const l of SAMPLE_LOGS) {
      await pool.query(
        `INSERT INTO agent_logs (id, agent_id, session_id, level, message, metadata, created_at)
         VALUES ($1,$2,$3,$4,$5,'{}',$6)
         ON CONFLICT (id) DO NOTHING`,
        [l.id, l.agent_id, l.session_id, l.level, l.message, now]
      );
    }
    return NextResponse.json({ success: true, seeded: SAMPLE_LOGS.length });
  } catch (error) {
    console.error("[Logs Seed] Error:", error);
    return NextResponse.json(
      { error: "Failed to seed logs" },
      { status: 500 }
    );
  }
}
