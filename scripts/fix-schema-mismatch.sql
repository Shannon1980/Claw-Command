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

-- 3. Webhooks table (for overview stats)
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

-- 4. Users table (if notifications references it)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. Notifications table (for overview stats)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info',
  resource_url TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);

-- 6. Users: add username, password_hash for auth (if missing)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
UPDATE users SET username = email WHERE username IS NULL AND email IS NOT NULL;

-- 7. Sessions auth (for login)
CREATE TABLE IF NOT EXISTS sessions_auth (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 8. mc_memories: add category, updated_at
ALTER TABLE mc_memories ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE mc_memories ADD COLUMN IF NOT EXISTS updated_at TEXT;
UPDATE mc_memories SET updated_at = created_at WHERE updated_at IS NULL;

-- 9. Token usage (for Sessions page)
CREATE TABLE IF NOT EXISTS token_usage (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES agents(id),
  session_id TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_cents NUMERIC NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 10. Gateways (for gateways page)
CREATE TABLE IF NOT EXISTS gateways (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_check_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 11. Alert rules (for alerts page)
CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT '{}',
  channels TEXT NOT NULL DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 12. Pipelines (for orchestration page)
CREATE TABLE IF NOT EXISTS pipelines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  steps TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'idle',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  pipeline_id TEXT NOT NULL REFERENCES pipelines(id),
  status TEXT NOT NULL DEFAULT 'running',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

-- 13. Cron jobs (for cron page)
CREATE TABLE IF NOT EXISTS cron_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  schedule TEXT NOT NULL,
  command TEXT NOT NULL,
  last_run_at TEXT,
  run_count INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 14. Webhook deliveries
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

-- 15. Agent messages (for agent chat)
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT NOT NULL REFERENCES agents(id),
  to_agent_id TEXT NOT NULL REFERENCES agents(id),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 16. Memory: add category and updated_at columns
ALTER TABLE mc_memories ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE mc_memories ADD COLUMN IF NOT EXISTS updated_at TEXT;

-- 17. Audit log (for audit page)
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  user_id TEXT,
  details TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);
