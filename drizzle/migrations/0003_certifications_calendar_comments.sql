-- Certifications table
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

-- Calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'vorentoe',
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  protected BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Task comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id TEXT,
  created_at TEXT NOT NULL
);
