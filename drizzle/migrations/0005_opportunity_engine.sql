-- Opportunity Engine: Qualified opportunities from SAM.gov and other sources
CREATE TABLE IF NOT EXISTS qualified_opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  agency TEXT NOT NULL DEFAULT '',
  amount NUMERIC DEFAULT 0,
  deadline TEXT,
  days_until_close INTEGER DEFAULT 0,
  naics_codes TEXT NOT NULL DEFAULT '[]',
  set_aside_type TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'sam_gov',
  source_url TEXT NOT NULL DEFAULT '',
  solicitation_number TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  fit_score NUMERIC NOT NULL DEFAULT 0,
  win_probability INTEGER NOT NULL DEFAULT 0,
  action TEXT NOT NULL DEFAULT 'PASS',
  channel TEXT NOT NULL DEFAULT 'direct',
  fit_breakdown TEXT NOT NULL DEFAULT '{}',
  win_breakdown TEXT NOT NULL DEFAULT '{}',
  win_themes TEXT NOT NULL DEFAULT '[]',
  dedupe_hash TEXT NOT NULL UNIQUE,
  scanned_at TEXT NOT NULL,
  qualified_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qualified_opps_action ON qualified_opportunities(action);
CREATE INDEX IF NOT EXISTS idx_qualified_opps_dedupe ON qualified_opportunities(dedupe_hash);
CREATE INDEX IF NOT EXISTS idx_qualified_opps_source ON qualified_opportunities(source);
