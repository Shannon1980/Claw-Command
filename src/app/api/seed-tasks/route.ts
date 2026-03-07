import { NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

const now = new Date().toISOString();

// REAL tasks from Shannon's actual workflow
const REAL_TASKS = [
  {
    id: "task-mbe-section4",
    title: "Maryland MBE Section 4 — Complete & Submit",
    assigned_to_agent_id: "veronica",
    depends_on_shannon: true,
    status: "blocked",
    due_date: "2026-03-07",
  },
  {
    id: "task-cpars-draft",
    title: "CPARS Self-Assessment Draft — SEAS IT FY2025",
    assigned_to_agent_id: "skylar",
    depends_on_shannon: true,
    status: "in_progress",
    due_date: "2026-03-13",
  },
  {
    id: "task-wosb-cert",
    title: "WOSB Certification — Complete Application",
    assigned_to_agent_id: "veronica",
    depends_on_shannon: true,
    status: "in_progress",
    due_date: "2026-03-31",
  },
  {
    id: "task-8a-eligibility",
    title: "8(a) Program — Verify Eligibility & Begin Application",
    assigned_to_agent_id: "veronica",
    depends_on_shannon: true,
    status: "backlog",
    due_date: "2026-04-15",
  },
  {
    id: "task-lsbrp-registration",
    title: "Montgomery County LSBRP Vendor Registration",
    assigned_to_agent_id: "veronica",
    depends_on_shannon: false,
    status: "backlog",
    due_date: "2026-03-21",
  },
  {
    id: "task-navy-fed-signature",
    title: "Navy Fed Signature Card — Order & Submit",
    assigned_to_agent_id: "veronica",
    depends_on_shannon: false,
    status: "in_progress",
    due_date: "2026-03-10",
  },
  {
    id: "task-seas-admin-access",
    title: "SEAS IT — Resolve Lost Admin Access in Production",
    assigned_to_agent_id: "skylar",
    depends_on_shannon: false,
    status: "blocked",
    due_date: "2026-03-07",
  },
  {
    id: "task-seas-hiring",
    title: "SEAS IT — Draft PDs for 4 Critical Roles (Option Year 2)",
    assigned_to_agent_id: "skylar",
    depends_on_shannon: true,
    status: "backlog",
    due_date: "2026-03-14",
  },
  {
    id: "task-recompete-strategy",
    title: "Skyward Recompete Strategy — Finalize Competitor List",
    assigned_to_agent_id: "depa",
    depends_on_shannon: false,
    status: "in_progress",
    due_date: "2026-03-14",
  },
  {
    id: "task-emarketplace",
    title: "eMaryland Marketplace Vendor Registration",
    assigned_to_agent_id: "veronica",
    depends_on_shannon: false,
    status: "backlog",
    due_date: "2026-03-21",
  },
  {
    id: "task-claw-command",
    title: "Claw Command Dashboard — Deploy & Wire Real Data",
    assigned_to_agent_id: "forge",
    depends_on_shannon: false,
    status: "in_progress",
    due_date: "2026-03-07",
  },
  {
    id: "task-safe-lesson4",
    title: "SAFe Lesson 4 Prep — Speaker Notes & Materials",
    assigned_to_agent_id: "bob",
    depends_on_shannon: false,
    status: "backlog",
    due_date: "2026-03-11",
  },
];

// REAL alerts based on actual deadlines
const REAL_ALERTS = [
  {
    id: "alert-mbe-deadline",
    title: "Maryland MBE Section 4 due FRIDAY 3/7 @ 5 PM",
    severity: "critical",
    trigger_type: "cert_window_closing",
    resource_id: "task-mbe-section4",
    due_date: "2026-03-07",
  },
  {
    id: "alert-cpars-deadline",
    title: "CPARS Self-Assessment due March 13",
    severity: "warning",
    trigger_type: "deadline_72h",
    resource_id: "task-cpars-draft",
    due_date: "2026-03-13",
  },
  {
    id: "alert-seas-admin",
    title: "SEAS IT admin access still unresolved (overdue)",
    severity: "critical",
    trigger_type: "task_overdue",
    resource_id: "task-seas-admin-access",
    due_date: "2026-02-17",
  },
];

export async function POST() {
  if (!pool) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Clear old tasks and alerts only (keep agents)
    await client.query("DELETE FROM activities");
    await client.query("DELETE FROM alerts");
    await client.query("DELETE FROM tasks");

    // Insert real tasks
    for (const t of REAL_TASKS) {
      await client.query(
        `INSERT INTO tasks (id, title, assigned_to_agent_id, depends_on_shannon, status, due_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.title, t.assigned_to_agent_id, t.depends_on_shannon, t.status, t.due_date, now, now]
      );
    }

    // Insert real alerts
    for (const a of REAL_ALERTS) {
      await client.query(
        `INSERT INTO alerts (id, title, severity, trigger_type, resource_id, due_date, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [a.id, a.title, a.severity, a.trigger_type, a.resource_id, a.due_date, now]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      tasks: REAL_TASKS.length,
      alerts: REAL_ALERTS.length,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Seed Tasks] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
