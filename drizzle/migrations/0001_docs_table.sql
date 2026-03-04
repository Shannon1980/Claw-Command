-- Docs table for workspace document management
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
