import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const now = new Date().toISOString();

const AGENTS = [
  { id: "bob", name: "Bob", emoji: "🤖", domain: "vorentoe", status: "active", current_task_id: "task-orchestrate" },
  { id: "bertha", name: "Bertha", emoji: "💼", domain: "vorentoe", status: "active", current_task_id: "task-2" },
  { id: "veronica", name: "Veronica", emoji: "🎯", domain: "vorentoe", status: "waiting_for_shannon", current_task_id: "task-1" },
  { id: "depa", name: "Depa", emoji: "📊", domain: "vorentoe", status: "active", current_task_id: "task-intel" },
  { id: "forge", name: "Forge", emoji: "⚙️", domain: "vorentoe", status: "active", current_task_id: "task-6" },
  { id: "atlas", name: "Atlas", emoji: "🖥️", domain: "vorentoe", status: "idle", current_task_id: null },
  { id: "muse", name: "Muse", emoji: "🎨", domain: "vorentoe", status: "idle", current_task_id: null },
  { id: "peter", name: "Peter", emoji: "📋", domain: "vorentoe", status: "active", current_task_id: "task-sprint" },
  { id: "harmony", name: "Harmony", emoji: "👥", domain: "community", status: "idle", current_task_id: null },
  { id: "skylar", name: "Skylar", emoji: "🌤️", domain: "skyward", status: "active", current_task_id: "task-7" },
  { id: "sentinel", name: "Sentinel", emoji: "🛡️", domain: "vorentoe", status: "idle", current_task_id: null },
];

const OPPORTUNITIES = [
  { id: "opp-dhs-border", title: "DHS Border Technology Modernization", stage: "qualify", value_usd: 250000000, probability: 40, owner_agent_id: "bertha", shannon_approval: null },
  { id: "opp-va-digital", title: "VA Digital Transformation", stage: "capture", value_usd: 410000000, probability: 60, owner_agent_id: "bertha", shannon_approval: true },
  { id: "opp-navy-cyber", title: "Navy Cybersecurity Operations", stage: "propose", value_usd: 180000000, probability: 75, owner_agent_id: "bertha", shannon_approval: true },
  { id: "opp-disa-cloud", title: "DISA Cloud Migration", stage: "win", value_usd: 320000000, probability: 95, owner_agent_id: "bertha", shannon_approval: true },
  { id: "opp-army-netcom", title: "Army NETCOM IT Services", stage: "identify", value_usd: 89000000, probability: 20, owner_agent_id: "depa", shannon_approval: null },
  { id: "opp-sba-wosb", title: "SBA WOSB Portal Enhancement", stage: "win", value_usd: 65000000, probability: 100, owner_agent_id: "bertha", shannon_approval: true },
];

const APPLICATIONS = [
  { id: "app-notetaker", title: "NoteTaker AI", stage: "mvp", description: "AI-powered meeting note taker with action item extraction", owner_agent_id: "forge", shannon_approval: true },
  { id: "app-govforecast", title: "GovForecast", stage: "prototype", description: "Government contract opportunity forecasting and analysis", owner_agent_id: "forge", shannon_approval: true },
  { id: "app-busybee", title: "BusyBee", stage: "concept", description: "Productivity tracker for distributed teams", owner_agent_id: "atlas", shannon_approval: null },
  { id: "app-community-board", title: "Community Board", stage: "design", description: "Neighborhood organizing and event coordination platform", owner_agent_id: "atlas", shannon_approval: null },
];

const TASKS = [
  { id: "task-1", title: "Complete 8(a) certification application", assigned_to_agent_id: "veronica", depends_on_shannon: true, status: "in_progress", due_date: "2026-03-15" },
  { id: "task-2", title: "Draft DHS Border Tech capability statement", assigned_to_agent_id: "bertha", depends_on_shannon: false, status: "in_progress", due_date: "2026-03-10" },
  { id: "task-3", title: "Review VA proposal pricing", assigned_to_agent_id: "bertha", depends_on_shannon: true, status: "blocked", due_date: "2026-03-08" },
  { id: "task-4", title: "NoteTaker AI beta testing plan", assigned_to_agent_id: "forge", depends_on_shannon: false, status: "backlog", due_date: "2026-03-20" },
  { id: "task-5", title: "Approve MBE certification documents", assigned_to_agent_id: "veronica", depends_on_shannon: true, status: "blocked", due_date: "2026-03-06" },
  { id: "task-6", title: "GovForecast data pipeline architecture", assigned_to_agent_id: "forge", depends_on_shannon: false, status: "in_progress", due_date: "2026-03-12" },
  { id: "task-7", title: "SEAS IT quarterly status report", assigned_to_agent_id: "skylar", depends_on_shannon: true, status: "in_progress", due_date: "2026-03-07" },
  { id: "task-8", title: "PTA spring fundraiser planning", assigned_to_agent_id: "harmony", depends_on_shannon: true, status: "backlog", due_date: "2026-03-25" },
  { id: "task-9", title: "Navy Cybersecurity past performance write-up", assigned_to_agent_id: "bertha", depends_on_shannon: false, status: "in_progress", due_date: "2026-03-11" },
  { id: "task-10", title: "Brand guidelines v2 for Vorentoe", assigned_to_agent_id: "muse", depends_on_shannon: false, status: "backlog", due_date: "2026-03-30" },
];

const ALERTS = [
  { id: "alert-1", title: "MBE Certification deadline approaching", severity: "critical", trigger_type: "cert_window_closing", resource_id: "task-5", due_date: "2026-03-06" },
  { id: "alert-2", title: "VA proposal pricing review overdue", severity: "warning", trigger_type: "task_overdue", resource_id: "task-3", due_date: "2026-03-08" },
  { id: "alert-3", title: "DHS solicitation closing in 72 hours", severity: "warning", trigger_type: "bid_approaching", resource_id: "opp-dhs-border", due_date: "2026-03-07" },
];

const ACTIVITIES = [
  { id: "act-1", actor_agent_id: "bertha", event_type: "opportunity_staged", resource_type: "opportunity", resource_id: "opp-va-digital", details: JSON.stringify({ old_state: "qualify", new_state: "capture", message: "VA Digital moved to capture after initial meeting" }) },
  { id: "act-2", actor_agent_id: "veronica", event_type: "approval_requested", resource_type: "task", resource_id: "task-5", details: JSON.stringify({ message: "MBE docs ready for Shannon's review" }) },
  { id: "act-3", actor_agent_id: "forge", event_type: "task_started", resource_type: "task", resource_id: "task-6", details: JSON.stringify({ message: "Starting GovForecast data pipeline architecture" }) },
  { id: "act-4", actor_agent_id: "skylar", event_type: "task_started", resource_type: "task", resource_id: "task-7", details: JSON.stringify({ message: "Drafting SEAS IT quarterly status report" }) },
  { id: "act-5", actor_agent_id: null, event_type: "alert_fired", resource_type: "task", resource_id: "task-5", details: JSON.stringify({ message: "System alert: MBE cert deadline in 48 hours" }) },
];

export async function POST() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Clear existing data (reverse FK order)
    await client.query("DELETE FROM activities");
    await client.query("DELETE FROM alerts");
    await client.query("DELETE FROM tasks");
    await client.query("DELETE FROM skyward_workstreams");
    await client.query("DELETE FROM applications");
    await client.query("DELETE FROM opportunities");
    await client.query("DELETE FROM agents");

    // Seed agents
    for (const a of AGENTS) {
      await client.query(
        `INSERT INTO agents (id, name, emoji, domain, status, current_task_id, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [a.id, a.name, a.emoji, a.domain, a.status, a.current_task_id, now]
      );
    }

    // Seed opportunities
    for (const o of OPPORTUNITIES) {
      await client.query(
        `INSERT INTO opportunities (id, title, stage, value_usd, probability, owner_agent_id, shannon_approval, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [o.id, o.title, o.stage, o.value_usd, o.probability, o.owner_agent_id, o.shannon_approval, now, now]
      );
    }

    // Seed applications
    for (const a of APPLICATIONS) {
      await client.query(
        `INSERT INTO applications (id, title, stage, description, owner_agent_id, dependencies, shannon_approval, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [a.id, a.title, a.stage, a.description, a.owner_agent_id, "[]", a.shannon_approval, now, now]
      );
    }

    // Seed tasks
    for (const t of TASKS) {
      await client.query(
        `INSERT INTO tasks (id, title, assigned_to_agent_id, depends_on_shannon, status, due_date, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [t.id, t.title, t.assigned_to_agent_id, t.depends_on_shannon, t.status, t.due_date, now, now]
      );
    }

    // Seed alerts
    for (const a of ALERTS) {
      await client.query(
        `INSERT INTO alerts (id, title, severity, trigger_type, resource_id, due_date, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [a.id, a.title, a.severity, a.trigger_type, a.resource_id, a.due_date, now]
      );
    }

    // Seed activities
    for (const a of ACTIVITIES) {
      await client.query(
        `INSERT INTO activities (id, actor_agent_id, event_type, resource_type, resource_id, details, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [a.id, a.actor_agent_id, a.event_type, a.resource_type, a.resource_id, a.details, now]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      seeded: {
        agents: AGENTS.length,
        opportunities: OPPORTUNITIES.length,
        applications: APPLICATIONS.length,
        tasks: TASKS.length,
        alerts: ALERTS.length,
        activities: ACTIVITIES.length,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Seed] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
