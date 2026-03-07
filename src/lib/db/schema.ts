import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

// ─── AGENTS ─────────────────────────────────────────────────────────────────

export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🤖"),
  domain: text("domain").notNull(), // vorentoe | skyward | community | teaching
  status: text("status").notNull().default("idle"), // idle | active | blocked | waiting_for_shannon
  currentTaskId: text("current_task_id"),
  soul: text("soul"),
  capabilities: text("capabilities"), // JSON
  apiKey: text("api_key"),
  retiredAt: text("retired_at"),
  updatedAt: text("updated_at").notNull(),
});

// ─── OPPORTUNITIES (BD Pipeline) ────────────────────────────────────────────

export const opportunities = pgTable("opportunities", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("identify"), // identify | qualify | capture | propose | win | lost
  valueUsd: integer("value_usd").notNull().default(0), // stored in cents
  probability: integer("probability").notNull().default(0), // 0-100
  ownerAgentId: text("owner_agent_id")
    .notNull()
    .references(() => agents.id),
  shannonApproval: boolean("shannon_approval"), // null = pending, true = approved, false = rejected
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── APPLICATIONS (App Portfolio) ───────────────────────────────────────────

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("concept"), // concept | design | prototype | mvp | testflight | submission | live
  description: text("description").notNull().default(""),
  ownerAgentId: text("owner_agent_id")
    .notNull()
    .references(() => agents.id),
  dependencies: text("dependencies").notNull().default("[]"), // JSON array of task IDs
  shannonApproval: boolean("shannon_approval"), // null = pending
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── TASKS ──────────────────────────────────────────────────────────────────

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  assignedToAgentId: text("assigned_to_agent_id").references(() => agents.id), // null = assigned to Shannon (me)
  dependsOnShannon: boolean("depends_on_shannon").notNull().default(false),
  status: text("status").notNull().default("backlog"), // inbox | backlog | in_progress | review | quality_review | blocked | done
  priority: text("priority").notNull().default("medium"), // high | medium | low
  dueDate: text("due_date"),
  outcome: text("outcome"),
  project: text("project"),
  ticketRef: text("ticket_ref"),
  parentOpportunityId: text("parent_opportunity_id").references(
    () => opportunities.id
  ),
  parentApplicationId: text("parent_application_id").references(
    () => applications.id
  ),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── SKYWARD WORKSTREAMS ────────────────────────────────────────────────────

export const skywardWorkstreams = pgTable("skyward_workstreams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("on_track"), // on_track | at_risk | blocked
  ownerAgentId: text("owner_agent_id")
    .notNull()
    .references(() => agents.id),
  keyDates: text("key_dates").notNull().default("[]"), // JSON: [{ milestone, date }]
  updatedAt: text("updated_at").notNull(),
});

// ─── ACTIVITIES (Immutable Event Log) ───────────────────────────────────────

export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  actorAgentId: text("actor_agent_id").references(() => agents.id), // null for system events
  eventType: text("event_type").notNull(), // task_started | task_completed | approval_requested | approval_given | opportunity_staged | alert_fired
  resourceType: text("resource_type").notNull(), // task | opportunity | application | workstream
  resourceId: text("resource_id").notNull(),
  details: text("details").notNull().default("{}"), // JSON: { old_state, new_state, message }
  createdAt: text("created_at").notNull(),
});

// ─── ALERTS ─────────────────────────────────────────────────────────────────

export const alerts = pgTable("alerts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  severity: text("severity").notNull().default("info"), // info | warning | critical
  triggerType: text("trigger_type").notNull(), // deadline_72h | cert_window_closing | bid_approaching | task_overdue
  resourceId: text("resource_id").notNull(),
  dueDate: text("due_date"),
  dismissedAt: text("dismissed_at"), // null = active
  createdAt: text("created_at").notNull(),
});

// ─── EMAIL (AI-driven automation) ─────────────────────────────────────────────

export const emailAccounts = pgTable("email_accounts", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(), // gmail | outlook
  email: text("email").notNull(),
  accessToken: text("access_token"), // encrypted in production
  refreshToken: text("refresh_token"),
  tokenExpiresAt: text("token_expires_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const emailRules = pgTable("email_rules", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => emailAccounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  // JSON: [{ action: "move"|"delete"|"archive"|"draft_reply", targetFolder?, ... }]
  actions: text("actions").notNull().default("[]"),
  // Optional custom AI instructions for this rule
  aiPrompt: text("ai_prompt"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Audit log of AI-driven email actions
export const emailActions = pgTable("email_actions", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => emailAccounts.id, { onDelete: "cascade" }),
  ruleId: text("rule_id").references(() => emailRules.id, { onDelete: "set null" }),
  messageId: text("message_id").notNull(),
  threadId: text("thread_id"),
  action: text("action").notNull(), // move | delete | archive | draft_reply
  status: text("status").notNull().default("pending"), // pending | completed | failed
  details: text("details").notNull().default("{}"), // JSON: target_folder, error, etc.
  createdAt: text("created_at").notNull(),
});

// ─── MISSION CONTROL (MC Shell) ──────────────────────────────────────────────

export const mcOpportunities = pgTable("mc_opportunities", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("identify"),
  valueUsd: integer("value_usd"),
  probability: integer("probability"),
  ownerAgentId: text("owner_agent_id"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const mcTeachingTasks = pgTable("mc_teaching_tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("backlog"),
  priority: text("priority"),
  assignedToAgentId: text("assigned_to_agent_id"),
  dueDate: text("due_date"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const mcBlockers = pgTable("mc_blockers", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull().default("note"),
  status: text("status").notNull().default("open"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const mcSchedule = pgTable("mc_schedule", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  start: text("start").notNull(),
  end: text("end").notNull(),
  agentId: text("agent_id"),
  type: text("type"),
  notes: text("notes"),
});

export const mcMemories = pgTable("mc_memories", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  source: text("source"),
  tags: text("tags"), // JSON array
  category: text("category"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
});

// ─── CHAT MESSAGES ──────────────────────────────────────────────────────────

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  sender: text("sender").notNull(), // 'user' | 'agent'
  content: text("content").notNull(),
  status: text("status").default("sent"), // sent | delivered | read
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── USERS (Auth) ───────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("viewer"), // viewer | operator | admin
  email: text("email"),
  googleId: text("google_id"),
  approved: boolean("approved").default(true),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── AUTH SESSIONS ──────────────────────────────────────────────────────────

export const sessionsAuth = pgTable("sessions_auth", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").unique().notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

// ─── AGENT SOULS (SOUL System) ──────────────────────────────────────────────

export const agentSouls = pgTable("agent_souls", {
  id: text("id").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id),
  personality: text("personality").notNull().default(""),
  capabilities: text("capabilities").notNull().default("[]"), // JSON array
  systemPrompt: text("system_prompt").notNull().default(""),
  constraints: text("constraints").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── AGENT MESSAGES (Inter-agent Messaging) ─────────────────────────────────

export const agentMessages = pgTable("agent_messages", {
  id: text("id").primaryKey(),
  fromAgentId: text("from_agent_id")
    .notNull()
    .references(() => agents.id),
  toAgentId: text("to_agent_id")
    .notNull()
    .references(() => agents.id),
  content: text("content").notNull(),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull(),
});

// ─── AGENT LOGS (Log Ingestion) ─────────────────────────────────────────────

export const agentLogs = pgTable("agent_logs", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").references(() => agents.id),
  sessionId: text("session_id"),
  level: text("level").notNull().default("info"), // info | warn | error | debug
  message: text("message").notNull(),
  metadata: text("metadata").notNull().default("{}"), // JSON
  createdAt: text("created_at").notNull(),
});

// ─── TOKEN USAGE (Cost Tracking) ────────────────────────────────────────────

export const tokenUsage = pgTable("token_usage", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").references(() => agents.id),
  sessionId: text("session_id"),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costCents: integer("cost_cents").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

// ─── CRON JOBS (Scheduler) ──────────────────────────────────────────────────

export const cronJobs = pgTable("cron_jobs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  schedule: text("schedule").notNull(), // cron expression
  action: text("action").notNull().default("{}"), // JSON: endpoint + payload
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: text("last_run_at"),
  nextRunAt: text("next_run_at"),
  runCount: integer("run_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── PIPELINES (Orchestration) ──────────────────────────────────────────────

export const pipelines = pgTable("pipelines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  steps: text("steps").notNull().default("[]"), // JSON array
  status: text("status").notNull().default("draft"), // draft | active | paused | completed
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── PIPELINE RUNS (Pipeline Execution) ─────────────────────────────────────

export const pipelineRuns = pgTable("pipeline_runs", {
  id: text("id").primaryKey(),
  pipelineId: text("pipeline_id")
    .notNull()
    .references(() => pipelines.id),
  status: text("status").notNull().default("running"), // running | completed | failed | cancelled
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  results: text("results").notNull().default("{}"), // JSON
});

// ─── WEBHOOKS (Outbound Webhooks) ───────────────────────────────────────────

export const webhooks = pgTable("webhooks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  events: text("events").notNull().default("[]"), // JSON array of event types
  secret: text("secret").notNull(), // HMAC signing key
  enabled: boolean("enabled").notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── WEBHOOK DELIVERIES (Delivery Log) ──────────────────────────────────────

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: text("id").primaryKey(),
  webhookId: text("webhook_id")
    .notNull()
    .references(() => webhooks.id),
  eventType: text("event_type").notNull(),
  payload: text("payload").notNull(),
  status: text("status").notNull().default("pending"), // pending | success | failed
  responseCode: integer("response_code"),
  responseBody: text("response_body"),
  attempts: integer("attempts").notNull().default(0),
  nextRetryAt: text("next_retry_at"),
  createdAt: text("created_at").notNull(),
});

// ─── ALERT RULES (Configurable Alerts) ──────────────────────────────────────

export const alertRules = pgTable("alert_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  condition: text("condition").notNull().default("{}"), // JSON
  channels: text("channels").notNull().default("[]"), // JSON
  enabled: boolean("enabled").notNull().default(true),
  lastFiredAt: text("last_fired_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── AUDIT EVENTS (Audit Trail) ─────────────────────────────────────────────

export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  details: text("details").notNull().default("{}"), // JSON
  ipAddress: text("ip_address"),
  createdAt: text("created_at").notNull(),
});

// ─── NOTIFICATIONS (Notification Center) ────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  type: text("type").notNull().default("info"),
  resourceUrl: text("resource_url"),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull(),
});

// ─── CERTIFICATIONS ─────────────────────────────────────────────────────────

export const certifications = pgTable("certifications", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  level: text("level").notNull().default("Federal"),
  authority: text("authority").notNull().default(""),
  status: text("status").notNull().default("NOT_STARTED"),
  dueDate: text("due_date"),
  appliedDate: text("applied_date"),
  decisionExpected: text("decision_expected"),
  expiresDate: text("expires_date"),
  description: text("description"),
  notes: text("notes"),
  documents: text("documents").notNull().default("[]"), // JSON array
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── CALENDAR EVENTS ────────────────────────────────────────────────────────

export const calendarEvents = pgTable("calendar_events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  domain: text("domain").notNull().default("vorentoe"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  protected: boolean("protected").notNull().default(false),
  description: text("description"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── TASK COMMENTS ──────────────────────────────────────────────────────────

export const taskComments = pgTable("task_comments", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id),
  author: text("author").notNull(),
  content: text("content").notNull(),
  parentCommentId: text("parent_comment_id"),
  createdAt: text("created_at").notNull(),
});

// ─── GATEWAYS (Multi-gateway) ───────────────────────────────────────────────

export const gateways = pgTable("gateways", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  status: text("status").notNull().default("unknown"), // online | offline | unknown
  lastCheckAt: text("last_check_at"),
  createdAt: text("created_at").notNull(),
});
