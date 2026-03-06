# Claw Command — OpenClaw Sync

## How Real Data Flows

The sync runs **inside OpenClaw** (not as an external script), because only OpenClaw
has access to session data via internal tools (`sessions_list`).

### Automatic Sync (via Heartbeat)

Bob (Chief of Staff) pushes agent status to the dashboard on each heartbeat cycle.
When sub-agents (Forge, Atlas, etc.) are spawned, their status is tracked and pushed.

**Endpoint:** `POST https://claw-command-pi.vercel.app/api/sync/push`

**Payload:**
```json
{
  "agents": [
    { "id": "bob", "name": "Bob", "emoji": "🤖", "domain": "vorentoe", "status": "active", "currentTask": "..." }
  ],
  "activities": [
    { "id": "...", "actorAgentId": "bob", "eventType": "task_started", "resourceType": "task", "resourceId": "...", "details": "..." }
  ]
}
```

### Manual Sync

From any OpenClaw session, Bob can push a sync by calling the push endpoint with
current session data.

### Security

Optional: Set `SYNC_SECRET_KEY` in Vercel env vars and include `syncKey` in payload.

### Agent Status Logic

- **active**: Agent has an OpenClaw session updated within the last 5 minutes
- **idle**: No recent session activity
- **blocked**: Manually set when a task is blocked
- **waiting_for_shannon**: Set when a task requires Shannon's approval

### Agent Context (Certifications, Tasks, Alerts)

When tasks are pushed to OpenClaw, we include a `context_url` so agents can fetch live data:

- **Endpoint:** `GET /api/agent-context?agentId=veronica&scope=all&format=text`
- **Returns:** Certifications, active alerts, and tasks (filtered by agent).

See [docs/AGENT_CONTEXT.md](docs/AGENT_CONTEXT.md) for full details.

### Mission Control Compatibility

Claw-Command exposes Mission Control–compatible APIs under `/api/mc/`:

- **Task queue:** `GET /api/mc/tasks/queue?agent=veronica`
- **Heartbeat:** `POST /api/mc/agents/veronica/heartbeat`
- **Spawn:** `POST /api/mc/spawn`

See [docs/MISSION_CONTROL.md](docs/MISSION_CONTROL.md) for full integration details.
