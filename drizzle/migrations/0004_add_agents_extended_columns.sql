-- Add columns to agents table that the API depends on
ALTER TABLE agents ADD COLUMN IF NOT EXISTS soul TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS capabilities TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS retired_at TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS created_at TEXT;
UPDATE agents SET created_at = updated_at WHERE created_at IS NULL;

-- Add priority column to tasks table (referenced by agents JOIN query)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
