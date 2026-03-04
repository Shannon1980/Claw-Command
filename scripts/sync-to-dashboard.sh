#!/bin/bash
# Claw Command — OpenClaw → Dashboard Sync Script
# Runs locally on Shannon's machine, pushes data to Vercel
#
# Usage: ./scripts/sync-to-dashboard.sh
# Cron:  */5 * * * * /path/to/sync-to-dashboard.sh

GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-http://127.0.0.1:18789}"
DASHBOARD_URL="${CLAW_COMMAND_URL:-https://claw-command-pi.vercel.app}"
SYNC_KEY="${SYNC_SECRET_KEY:-}"

echo "[$(date)] Syncing OpenClaw → Claw Command..."

# Fetch active sessions from OpenClaw gateway
SESSIONS=$(curl -s --max-time 10 "${GATEWAY_URL}/api/sessions" 2>/dev/null)

if [ -z "$SESSIONS" ] || [ "$SESSIONS" = "null" ]; then
  echo "[$(date)] ⚠️  Gateway unreachable or no sessions"
  exit 1
fi

# Build agent status payload using node
PAYLOAD=$(node -e "
const sessions = JSON.parse(process.argv[1] || '[]');

// Known agent mappings
const AGENT_MAP = {
  'main': { id: 'bob', name: 'Bob', emoji: '🤖', domain: 'vorentoe' },
  'bob': { id: 'bob', name: 'Bob', emoji: '🤖', domain: 'vorentoe' },
  'bertha': { id: 'bertha', name: 'Bertha', emoji: '💼', domain: 'vorentoe' },
  'veronica': { id: 'veronica', name: 'Veronica', emoji: '🎯', domain: 'vorentoe' },
  'depa': { id: 'depa', name: 'Depa', emoji: '📊', domain: 'vorentoe' },
  'forge': { id: 'forge', name: 'Forge', emoji: '⚙️', domain: 'vorentoe' },
  'atlas': { id: 'atlas', name: 'Atlas', emoji: '🖥️', domain: 'vorentoe' },
  'muse': { id: 'muse', name: 'Muse', emoji: '🎨', domain: 'vorentoe' },
  'peter': { id: 'peter', name: 'Peter', emoji: '📋', domain: 'vorentoe' },
  'harmony': { id: 'harmony', name: 'Harmony', emoji: '👥', domain: 'community' },
  'skylar': { id: 'skylar', name: 'Skylar', emoji: '🌤️', domain: 'skyward' },
  'sentinel': { id: 'sentinel', name: 'Sentinel', emoji: '🛡️', domain: 'vorentoe' },
};

const agentUpdates = new Map();
const activities = [];

for (const session of (Array.isArray(sessions) ? sessions : [])) {
  const label = (session.label || session.agentId || session.key || '').toLowerCase();
  
  // Find matching agent
  let agent = null;
  for (const [key, val] of Object.entries(AGENT_MAP)) {
    if (label === key || label.includes(key)) {
      agent = val;
      break;
    }
  }
  if (!agent) continue;

  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const lastActive = new Date(session.updatedAt || session.lastMessageAt || 0).getTime();
  const isActive = lastActive > fiveMinAgo;

  // Keep most recent update per agent
  const existing = agentUpdates.get(agent.id);
  if (!existing || lastActive > new Date(existing._lastActive).getTime()) {
    agentUpdates.set(agent.id, {
      ...agent,
      status: isActive ? 'active' : 'idle',
      currentTask: session.label || session.task || null,
      _lastActive: lastActive,
    });
  }

  // Create activity from session
  if (isActive) {
    activities.push({
      id: 'sync-' + session.key + '-' + Date.now(),
      actorAgentId: agent.id,
      eventType: 'task_started',
      resourceType: 'task',
      resourceId: session.key,
      details: JSON.stringify({ message: session.label || 'Active session', source: 'openclaw-sync' }),
    });
  }
}

// Clean internal fields
const agents = Array.from(agentUpdates.values()).map(({_lastActive, ...rest}) => rest);

console.log(JSON.stringify({
  agents,
  activities: activities.slice(0, 20),
  syncKey: process.env.SYNC_SECRET_KEY || '',
}));
" "$SESSIONS" 2>/dev/null)

if [ -z "$PAYLOAD" ]; then
  echo "[$(date)] ⚠️  Failed to build payload"
  exit 1
fi

# Push to dashboard
RESPONSE=$(curl -s --max-time 15 -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "${DASHBOARD_URL}/api/sync/push")

echo "[$(date)] ✅ Response: $RESPONSE"
