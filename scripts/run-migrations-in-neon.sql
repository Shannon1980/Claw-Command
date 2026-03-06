-- Run this in Neon Console → SQL Editor
-- https://console.neon.tech → Your Project → SQL Editor

-- 1. Initial Schema
CREATE TABLE IF NOT EXISTS agents (
  id text PRIMARY KEY,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '•',
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  current_task_id TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'identify',
  value_usd INTEGER NOT NULL DEFAULT 0,
  probability INTEGER NOT NULL DEFAULT 0,
  owner_agent_id TEXT NOT NULL REFERENCES agents(id),
  shannon_approval BOOLEAN,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'concept',
  description TEXT NOT NULL DEFAULT '',
  owner_agent_id TEXT NOT NULL REFERENCES agents(id),
  dependencies TEXT NOT NULL DEFAULT '[]',
  shannon_approval BOOLEAN,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  assigned_to_agent_id TEXT REFERENCES agents(id),
  depends_on_shannon BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'backlog',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TEXT,
  parent_opportunity_id TEXT REFERENCES opportunities(id),
  parent_application_id TEXT REFERENCES applications(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Allow null for assigned_to_agent_id (null = assigned to Shannon/me)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks'
    AND column_name = 'assigned_to_agent_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN assigned_to_agent_id DROP NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS skyward_workstreams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'on_track',
  owner_agent_id TEXT NOT NULL REFERENCES agents(id),
  key_dates TEXT NOT NULL DEFAULT '[]',
  description TEXT DEFAULT '',
  risk_factors TEXT DEFAULT '[]',
  updated_at TEXT NOT NULL
);

-- Add priority to tasks if missing
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';

-- Add columns if table already exists (idempotent)
ALTER TABLE skyward_workstreams ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE skyward_workstreams ADD COLUMN IF NOT EXISTS risk_factors TEXT DEFAULT '[]';

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  actor_agent_id TEXT REFERENCES agents(id),
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  trigger_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  due_date TEXT,
  dismissed_at TEXT,
  created_at TEXT NOT NULL
);

-- 2. Docs table
CREATE TABLE IF NOT EXISTS docs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'document',
  content TEXT NOT NULL DEFAULT '',
  author_agent_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  file_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_agent ON chat_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_status ON chat_messages(status);

-- 5. Email automation (Option 3: API + worker)
CREATE TABLE IF NOT EXISTS email_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_rules (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  actions TEXT NOT NULL DEFAULT '[]',
  ai_prompt TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_actions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  rule_id TEXT REFERENCES email_rules(id) ON DELETE SET NULL,
  message_id TEXT NOT NULL,
  thread_id TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_actions_account ON email_actions(account_id);
CREATE INDEX IF NOT EXISTS idx_email_actions_created ON email_actions(created_at);

-- 6. Certifications
CREATE TABLE IF NOT EXISTS certifications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Federal',
  authority TEXT NOT NULL,
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

-- 7. Calendar events
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

CREATE INDEX IF NOT EXISTS idx_calendar_start ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_end ON calendar_events(end_time);

-- 9. Task comments (Mission Control-style)
CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author TEXT NOT NULL DEFAULT 'shannon',
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- 10. Mission Control (MC Shell) tables
CREATE TABLE IF NOT EXISTS mc_opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'identify',
  value_usd INTEGER,
  probability INTEGER,
  owner_agent_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mc_teaching_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'backlog',
  priority TEXT,
  assigned_to_agent_id TEXT,
  due_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mc_blockers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'note',
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mc_schedule (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  agent_id TEXT,
  type TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS mc_memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT,
  tags TEXT,
  created_at TEXT NOT NULL
);

-- 11. Activities archive (7-day retention)
CREATE TABLE IF NOT EXISTS activities_archive (
  id TEXT PRIMARY KEY,
  actor_agent_id TEXT,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  archived_at TEXT NOT NULL DEFAULT NOW()::text
);
