import { NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

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

const CERTIFICATIONS = [
  { id: "8a", name: "8(a) Program", level: "Federal", authority: "SBA", status: "NOT_STARTED", description: "Needs eligibility verification", documents: JSON.stringify([{ name: "Personal Financial Statement", completed: false }, { name: "Tax Returns (3 years)", completed: false }, { name: "Business Plan", completed: false }, { name: "Proof of Disadvantage", completed: false }, { name: "SBA Form 413", completed: false }]) },
  { id: "edwosb", name: "EDWOSB", level: "Federal", authority: "SBA", status: "NOT_STARTED", description: null, documents: JSON.stringify([{ name: "SAM.gov Registration", completed: false }, { name: "WOSB Certification", completed: false }, { name: "Economic Disadvantage Proof", completed: false }, { name: "Business License", completed: false }]) },
  { id: "wosb", name: "WOSB", level: "Federal", authority: "SBA", status: "IN_PROGRESS", description: null, documents: JSON.stringify([{ name: "SAM.gov Registration", completed: true }, { name: "Business Plan", completed: true }, { name: "Tax Returns", completed: true }, { name: "Financial Statements", completed: false }, { name: "Ownership Documents", completed: false }]) },
  { id: "md-mbe", name: "Maryland MBE", level: "State", authority: "MDOT", status: "SUBMITTED", due_date: "2026-03-07", applied_date: "2026-02-15", decision_expected: "2026-04-15", description: null, documents: JSON.stringify([{ name: "Articles of Organization", completed: true }, { name: "Operating Agreement", completed: true }, { name: "Tax Returns", completed: true }, { name: "Section 4 Form", completed: false }, { name: "Navy Fed Signature Card", completed: false }]) },
  { id: "lsbrp", name: "LSBRP Montgomery County", level: "Local", authority: "MoCo", status: "NOT_STARTED", description: null, documents: JSON.stringify([{ name: "Vendor Registration", completed: false }, { name: "Business License", completed: false }]) },
];

function getWeekDate(dayOffset: number, hour: number, minute = 0): string {
  const base = new Date("2026-03-04T12:00:00");
  const startOfWeek = new Date(base);
  startOfWeek.setDate(base.getDate() - base.getDay());
  const d = new Date(startOfWeek);
  d.setDate(startOfWeek.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const CALENDAR_EVENTS = [
  { id: "evt-1", title: "SEAS IT Standup", domain: "skyward", start_time: getWeekDate(1, 9, 0), end_time: getWeekDate(1, 10, 0), protected: false, description: null },
  { id: "evt-2", title: "Vorentoe Strategy Session", domain: "vorentoe", start_time: getWeekDate(1, 14, 0), end_time: getWeekDate(1, 15, 0), protected: false, description: null },
  { id: "evt-3", title: "MBE Application Review", domain: "vorentoe", start_time: getWeekDate(2, 10, 0), end_time: getWeekDate(2, 11, 0), protected: false, description: null },
  { id: "evt-4", title: "Teaching — SAFe SSM (ITBiz 301)", domain: "teaching", start_time: getWeekDate(2, 18, 0), end_time: getWeekDate(2, 21, 0), protected: true, description: "Recurring SAFe Scrum Master instruction through April 2026" },
  { id: "evt-5", title: "DHS Border Tech Prep", domain: "vorentoe", start_time: getWeekDate(3, 13, 0), end_time: getWeekDate(3, 14, 0), protected: false, description: null },
  { id: "evt-6", title: "SEAS IT Sprint Review", domain: "skyward", start_time: getWeekDate(4, 9, 0), end_time: getWeekDate(4, 10, 0), protected: false, description: null },
  { id: "evt-7", title: "Teaching — SAFe SSM (ITBiz 301)", domain: "teaching", start_time: getWeekDate(4, 18, 0), end_time: getWeekDate(4, 21, 0), protected: true, description: "Recurring SAFe Scrum Master instruction through April 2026" },
  { id: "evt-8", title: "Client Proposal Review Call", domain: "vorentoe", start_time: getWeekDate(4, 19, 0), end_time: getWeekDate(4, 20, 0), protected: false, description: null },
  { id: "evt-9", title: "PTA Planning Call", domain: "community", start_time: getWeekDate(5, 11, 0), end_time: getWeekDate(5, 12, 0), protected: false, description: null },
];

const AGENT_LOGS = [
  { id: "log-1", agent_id: "bob", session_id: "sess-001", level: "info", message: "Orchestration cycle started" },
  { id: "log-2", agent_id: "bertha", session_id: "sess-002", level: "info", message: "Drafting DHS Border Tech capability statement" },
  { id: "log-3", agent_id: "veronica", session_id: "sess-003", level: "warn", message: "MBE docs pending Shannon approval" },
  { id: "log-4", agent_id: "forge", session_id: "sess-004", level: "info", message: "GovForecast data pipeline architecture in progress" },
  { id: "log-5", agent_id: "depa", session_id: "sess-005", level: "debug", message: "Intel aggregation complete for Army NETCOM" },
  { id: "log-6", agent_id: "skylar", session_id: "sess-006", level: "info", message: "SEAS IT quarterly status report drafted" },
  { id: "log-7", agent_id: "bertha", session_id: "sess-002", level: "error", message: "VA proposal pricing lookup failed - retrying" },
  { id: "log-8", agent_id: "forge", session_id: "sess-004", level: "info", message: "NoteTaker AI beta testing plan created" },
  { id: "log-9", agent_id: "bob", session_id: "sess-001", level: "info", message: "Task assignments distributed to 4 agents" },
  { id: "log-10", agent_id: "peter", session_id: "sess-007", level: "info", message: "Sprint backlog updated" },
];

const TOKEN_USAGE = [
  { id: "tu-1", agent_id: "bob", session_id: "sess-001", model: "claude-sonnet-4-20250514", input_tokens: 2400, output_tokens: 800, cost_cents: 1.2 },
  { id: "tu-2", agent_id: "bob", session_id: "sess-001", model: "claude-sonnet-4-20250514", input_tokens: 3100, output_tokens: 1200, cost_cents: 1.8 },
  { id: "tu-3", agent_id: "bertha", session_id: "sess-002", model: "claude-sonnet-4-20250514", input_tokens: 5200, output_tokens: 2100, cost_cents: 3.4 },
  { id: "tu-4", agent_id: "bertha", session_id: "sess-002", model: "claude-sonnet-4-20250514", input_tokens: 4800, output_tokens: 1900, cost_cents: 3.1 },
  { id: "tu-5", agent_id: "veronica", session_id: "sess-003", model: "claude-sonnet-4-20250514", input_tokens: 1800, output_tokens: 600, cost_cents: 0.9 },
  { id: "tu-6", agent_id: "forge", session_id: "sess-004", model: "claude-sonnet-4-20250514", input_tokens: 8200, output_tokens: 3400, cost_cents: 5.6 },
  { id: "tu-7", agent_id: "forge", session_id: "sess-004", model: "claude-sonnet-4-20250514", input_tokens: 6100, output_tokens: 2800, cost_cents: 4.2 },
  { id: "tu-8", agent_id: "forge", session_id: "sess-004", model: "claude-sonnet-4-20250514", input_tokens: 4500, output_tokens: 1600, cost_cents: 2.8 },
  { id: "tu-9", agent_id: "depa", session_id: "sess-005", model: "claude-sonnet-4-20250514", input_tokens: 3200, output_tokens: 1100, cost_cents: 1.7 },
  { id: "tu-10", agent_id: "skylar", session_id: "sess-006", model: "claude-sonnet-4-20250514", input_tokens: 2900, output_tokens: 950, cost_cents: 1.5 },
];

export async function POST() {
  if (!pool) {
    return NextResponse.json(
      { success: false, error: "Database not configured. Set DATABASE_URL." },
      { status: 503 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Ensure all tables exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, emoji TEXT, domain TEXT NOT NULL DEFAULT 'vorentoe',
        status TEXT NOT NULL DEFAULT 'idle', current_task_id TEXT, soul TEXT, capabilities TEXT,
        api_key TEXT, retired_at TEXT, created_at TEXT, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS opportunities (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'identify',
        value_usd NUMERIC, probability INTEGER DEFAULT 0, owner_agent_id TEXT,
        shannon_approval BOOLEAN, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'concept',
        description TEXT, owner_agent_id TEXT, dependencies TEXT DEFAULT '[]',
        shannon_approval BOOLEAN, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '',
        assigned_to_agent_id TEXT, depends_on_shannon BOOLEAN DEFAULT false,
        status TEXT NOT NULL DEFAULT 'backlog', priority TEXT NOT NULL DEFAULT 'medium',
        due_date TEXT, outcome TEXT, project TEXT, ticket_ref TEXT,
        parent_opportunity_id TEXT, parent_application_id TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY, actor_agent_id TEXT, event_type TEXT NOT NULL,
        resource_type TEXT, resource_id TEXT, details TEXT DEFAULT '{}', created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'info',
        trigger_type TEXT, resource_id TEXT, due_date TEXT, dismissed BOOLEAN DEFAULT false,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS certifications (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, level TEXT NOT NULL DEFAULT 'Federal',
        authority TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'NOT_STARTED',
        due_date TEXT, applied_date TEXT, decision_expected TEXT, expires_date TEXT,
        description TEXT, notes TEXT, documents TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, domain TEXT NOT NULL DEFAULT 'vorentoe',
        start_time TEXT NOT NULL, end_time TEXT NOT NULL, protected BOOLEAN NOT NULL DEFAULT false,
        description TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS skyward_workstreams (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
        description TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT, role TEXT NOT NULL DEFAULT 'viewer',
        username TEXT, password_hash TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY, user_id TEXT, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'info', resource_url TEXT, read_at TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions_auth (
        token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS token_usage (
        id TEXT PRIMARY KEY, agent_id TEXT, session_id TEXT, model TEXT,
        input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
        cost_cents NUMERIC NOT NULL DEFAULT 0, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS agent_logs (
        id TEXT PRIMARY KEY, agent_id TEXT, session_id TEXT, level TEXT NOT NULL DEFAULT 'info',
        message TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS agent_souls (
        id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, personality TEXT NOT NULL DEFAULT '',
        capabilities TEXT NOT NULL DEFAULT '', system_prompt TEXT NOT NULL DEFAULT '',
        constraints TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS agent_messages (
        id TEXT PRIMARY KEY, from_agent_id TEXT NOT NULL, to_agent_id TEXT NOT NULL,
        content TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL, details TEXT NOT NULL DEFAULT '{}', ip_address TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, events TEXT NOT NULL DEFAULT '[]',
        secret TEXT NOT NULL DEFAULT '', enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id TEXT PRIMARY KEY, webhook_id TEXT NOT NULL, event_type TEXT NOT NULL,
        payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', response_code INTEGER,
        response_body TEXT, attempts INTEGER NOT NULL DEFAULT 0, next_retry_at TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS alert_rules (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, condition_type TEXT NOT NULL DEFAULT '',
        threshold TEXT, channels TEXT NOT NULL DEFAULT '[]', enabled BOOLEAN NOT NULL DEFAULT true,
        last_fired TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pipelines (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
        steps TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pipeline_runs (
        id TEXT PRIMARY KEY, pipeline_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'running',
        current_step_index INTEGER NOT NULL DEFAULT 0, results TEXT NOT NULL DEFAULT '{}',
        started_at TEXT NOT NULL, completed_at TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS cron_jobs (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, schedule TEXT NOT NULL,
        command TEXT NOT NULL DEFAULT '{}', last_run_at TEXT, run_count INTEGER NOT NULL DEFAULT 0,
        enabled BOOLEAN NOT NULL DEFAULT true, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS gateways (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'unknown', last_check_at TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mc_memories (
        id TEXT PRIMARY KEY, content TEXT NOT NULL, source TEXT, tags TEXT,
        category TEXT, created_at TEXT NOT NULL, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
        content TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS task_comments (
        id TEXT PRIMARY KEY, task_id TEXT NOT NULL, author TEXT NOT NULL,
        content TEXT NOT NULL, parent_comment_id TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS email_accounts (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL DEFAULT 'gmail', email TEXT NOT NULL,
        access_token TEXT, refresh_token TEXT, token_expires_at TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS email_rules (
        id TEXT PRIMARY KEY, account_id TEXT NOT NULL, name TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true, actions TEXT NOT NULL DEFAULT '[]',
        ai_prompt TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS email_actions (
        id TEXT PRIMARY KEY, account_id TEXT, rule_id TEXT, message_id TEXT,
        action TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
        details TEXT, created_at TEXT NOT NULL
      );
    `);

    // Clear existing data (reverse FK order)
    await client.query("DELETE FROM agent_logs");
    await client.query("DELETE FROM activities");
    await client.query("DELETE FROM alerts");
    await client.query("DELETE FROM tasks");
    await client.query("DELETE FROM skyward_workstreams");
    await client.query("DELETE FROM applications");
    await client.query("DELETE FROM opportunities");
    await client.query("DELETE FROM agents");
    await client.query("DELETE FROM calendar_events");
    await client.query("DELETE FROM certifications");

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

    // Seed certifications
    for (const c of CERTIFICATIONS) {
      await client.query(
        `INSERT INTO certifications (id, name, level, authority, status, due_date, applied_date, decision_expected, expires_date, description, notes, documents, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)`,
        [
          c.id,
          c.name,
          c.level,
          c.authority,
          c.status,
          (c as { due_date?: string }).due_date ?? null,
          (c as { applied_date?: string }).applied_date ?? null,
          (c as { decision_expected?: string }).decision_expected ?? null,
          (c as { expires_date?: string }).expires_date ?? null,
          c.description ?? null,
          null,
          c.documents,
          now,
        ]
      );
    }

    // Seed token usage (for sessions page)
    await client.query("DELETE FROM token_usage");
    for (const tu of TOKEN_USAGE) {
      await client.query(
        `INSERT INTO token_usage (id, agent_id, session_id, model, input_tokens, output_tokens, cost_cents, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [tu.id, tu.agent_id, tu.session_id, tu.model, tu.input_tokens, tu.output_tokens, tu.cost_cents, now]
      );
    }

    // Seed agent logs (for logs page)
    for (const l of AGENT_LOGS) {
      await client.query(
        `INSERT INTO agent_logs (id, agent_id, session_id, level, message, metadata, created_at)
         VALUES ($1,$2,$3,$4,$5,'{}',$6)`,
        [l.id, l.agent_id, l.session_id, l.level, l.message, now]
      );
    }

    // Seed calendar events
    for (const e of CALENDAR_EVENTS) {
      await client.query(
        `INSERT INTO calendar_events (id, title, domain, start_time, end_time, protected, description, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
        [e.id, e.title, e.domain, e.start_time, e.end_time, e.protected, e.description, now]
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
        certifications: CERTIFICATIONS.length,
        calendar_events: CALENDAR_EVENTS.length,
        token_usage: TOKEN_USAGE.length,
        agent_logs: AGENT_LOGS.length,
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
