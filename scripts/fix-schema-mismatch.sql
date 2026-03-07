-- Fix schema mismatch: add missing columns and tables
-- Run in Neon Console → SQL Editor if you get "unable to fetch most data"
-- https://console.neon.tech → Your Project → SQL Editor

-- 1. Agents: add columns expected by /api/agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS soul TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS capabilities TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS retired_at TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS created_at TEXT;
UPDATE agents SET created_at = updated_at WHERE created_at IS NULL;

-- 2. Tasks: add columns expected by /api/tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ticket_ref TEXT;
ALTER TABLE tasks ALTER COLUMN assigned_to_agent_id DROP NOT NULL;

-- 3. Certifications (for seed data and certifications page)
CREATE TABLE IF NOT EXISTS certifications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Federal',
  authority TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  due_date TEXT,
  applied_date TEXT,
  decision_expected TEXT,
  expires_date TEXT,
  description TEXT,
  notes TEXT,
  documents TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 4. Calendar events (for seed data and calendar)
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'vorentoe',
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  protected BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. Task comments (for task detail view)
CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id TEXT,
  created_at TEXT NOT NULL
);

-- 6. Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 7. Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL DEFAULT '[]',
  secret TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 8. Webhook deliveries
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL REFERENCES webhooks(id),
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_code INTEGER,
  response_body TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  created_at TEXT NOT NULL
);

-- 9. Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  username TEXT,
  password_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
UPDATE users SET username = email WHERE username IS NULL AND email IS NOT NULL;

-- 10. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info',
  resource_url TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);

-- 11. Sessions auth (for login)
CREATE TABLE IF NOT EXISTS sessions_auth (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 12. Token usage (for Sessions and Tokens pages)
CREATE TABLE IF NOT EXISTS token_usage (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  session_id TEXT,
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_cents NUMERIC NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 13. Agent logs (for Logs page)
CREATE TABLE IF NOT EXISTS agent_logs (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  session_id TEXT,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

-- 14. Agent souls (for agent soul config)
CREATE TABLE IF NOT EXISTS agent_souls (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  personality TEXT NOT NULL DEFAULT '',
  capabilities TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL DEFAULT '',
  constraints TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 15. Agent messages (for agent chat)
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 16. Audit events (for Audit page)
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT,
  created_at TEXT NOT NULL
);

-- 17. Gateways (for gateways page)
CREATE TABLE IF NOT EXISTS gateways (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_check_at TEXT,
  created_at TEXT NOT NULL
);

-- 18. Alert rules (for alerts page)
CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL DEFAULT '',
  threshold TEXT,
  channels TEXT NOT NULL DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_fired TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 19. Pipelines (for orchestration page)
CREATE TABLE IF NOT EXISTS pipelines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  steps TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  pipeline_id TEXT NOT NULL REFERENCES pipelines(id),
  status TEXT NOT NULL DEFAULT 'running',
  current_step_index INTEGER NOT NULL DEFAULT 0,
  results TEXT NOT NULL DEFAULT '{}',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

-- 20. Cron jobs (for cron page)
CREATE TABLE IF NOT EXISTS cron_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  schedule TEXT NOT NULL,
  command TEXT NOT NULL DEFAULT '{}',
  last_run_at TEXT,
  run_count INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- API expects 'action' and 'next_run_at' columns
ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS next_run_at TEXT;
UPDATE cron_jobs SET action = command WHERE action IS NULL AND command IS NOT NULL;

-- 21. mc_memories: add category, updated_at
ALTER TABLE mc_memories ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE mc_memories ADD COLUMN IF NOT EXISTS updated_at TEXT;
UPDATE mc_memories SET updated_at = created_at WHERE updated_at IS NULL;

-- 22. Opportunities (for seed data)
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'identify',
  value_usd NUMERIC,
  probability INTEGER DEFAULT 0,
  owner_agent_id TEXT,
  shannon_approval BOOLEAN,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 23. Applications (for seed data)
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'concept',
  description TEXT,
  owner_agent_id TEXT,
  dependencies TEXT DEFAULT '[]',
  shannon_approval BOOLEAN,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 24. Email accounts
CREATE TABLE IF NOT EXISTS email_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'gmail',
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 25. Email rules
CREATE TABLE IF NOT EXISTS email_rules (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  actions TEXT NOT NULL DEFAULT '[]',
  ai_prompt TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 26. Email actions
CREATE TABLE IF NOT EXISTS email_actions (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  rule_id TEXT,
  message_id TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  details TEXT,
  created_at TEXT NOT NULL
);

-- 27. Skyward workstreams
CREATE TABLE IF NOT EXISTS skyward_workstreams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
