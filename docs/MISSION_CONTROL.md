# Mission Control Integration

Claw-Command exposes [Mission Control](https://github.com/builderz-labs/mission-control)–compatible APIs so agents and tools can use Claw-Command as a task source.

## Compatible Endpoints

All endpoints live under `/api/mc/` and mirror Mission Control's behavior.

### Task Queue

**GET** `/api/mc/tasks/queue?agent=veronica`

Agents poll this to get their next assigned task.

| Param | Description |
|-------|-------------|
| `agent` | Agent ID (e.g. `veronica`, `bertha`). Can also be sent via `x-agent-name` or `x-agent-id` header. |

**Response:**
```json
{
  "task": {
    "id": "task-1",
    "title": "Complete 8(a) certification application",
    "status": "in_progress",
    "priority": "high",
    "due_date": "2026-03-15",
    "depends_on_shannon": true,
    "created_at": "...",
    "updated_at": "..."
  },
  "reason": "assigned",
  "agent": "veronica",
  "timestamp": 1709568000000
}
```

`reason` values: `assigned` | `no_tasks_available`

### Agent Heartbeat

**POST** `/api/mc/agents/{id}/heartbeat`

Agents call this to report they're alive. Updates `agents.updated_at` and optionally status/current_task.

**Body (optional):**
```json
{
  "status": "active",
  "current_task": "task-1"
}
```

**Response:**
```json
{
  "success": true,
  "agent": "veronica",
  "pending_tasks": [...],
  "timestamp": 1709568000000
}
```

**GET** `/api/mc/agents/{id}/heartbeat` — Returns pending tasks without updating.

### Spawn

**POST** `/api/mc/spawn`

Create a task and push it to OpenClaw (Mission Control–style spawn).

**Body:**
```json
{
  "agent": "veronica",
  "task": "Review MBE certification documents",
  "params": {}
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "...",
  "task_id": "task-123",
  "error": null
}
```

## Using Claw-Command with Mission Control

If you run both Mission Control and Claw-Command:

1. **Claw-Command as task source** — Point Mission Control (or agents) at Claw-Command's `/api/mc/*` endpoints.
2. **Mission Control as dashboard** — Use Mission Control for its Kanban, cost tracking, and real-time UI while Claw-Command holds your domain data (certifications, pipeline, etc.).

### Environment

| Variable | Description |
|----------|-------------|
| `MISSION_CONTROL_URL` | (Optional) Base URL of Mission Control. If set, Claw-Command can sync from it. |
| `CLAW_COMMAND_URL` | Base URL of Claw-Command. Use this when configuring Mission Control to pull tasks from Claw-Command. |

## Differences from Mission Control

| Feature | Mission Control | Claw-Command MC API |
|---------|-----------------|---------------------|
| Agent IDs | Integer | String (e.g. `veronica`) |
| Task IDs | Integer | String (e.g. `task-1`) |
| Auth | Session/API key | None (add middleware if needed) |
| Task queue `reason` | `continue_current`, `at_capacity`, etc. | `assigned` or `no_tasks_available` |

## Example: Agent Polling

```bash
# Poll next task for Veronica
curl "https://your-claw-command.vercel.app/api/mc/tasks/queue?agent=veronica"

# Send heartbeat
curl -X POST "https://your-claw-command.vercel.app/api/mc/agents/veronica/heartbeat" \
  -H "Content-Type: application/json" \
  -d '{"status":"active","current_task":"task-1"}'
```
