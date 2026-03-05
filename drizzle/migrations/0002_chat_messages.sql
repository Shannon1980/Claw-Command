CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  sender TEXT NOT NULL, -- 'user' or 'agent'
  content TEXT NOT NULL,
  status TEXT DEFAULT 'sent', -- 'sent' (pending), 'delivered', 'read'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_agent ON chat_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_status ON chat_messages(status);
