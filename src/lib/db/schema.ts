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
  assignedToAgentId: text("assigned_to_agent_id").references(() => agents.id), // null = assigned to Shannon (me)
  dependsOnShannon: boolean("depends_on_shannon").notNull().default(false),
  status: text("status").notNull().default("backlog"), // backlog | in_progress | blocked | done
  dueDate: text("due_date"),
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
