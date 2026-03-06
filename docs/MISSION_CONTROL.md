# Mission Control Integration

Claw-Command exposes [Mission Control](https://github.com/builderz-labs/mission-control)–compatible APIs so agents and tools can use Claw-Command as a task source.

## Compatible Endpoints

Endpoints live under `/api/mc/`. Path aliases match Mission Control's default structure:

| MC Path | Claw-Command Alias |
|---------|--------------------|
| `/api/mc/tasks/queue` | `/api/tasks/queue` |
| `/api/mc/agents/{id}/heartbeat` | `/api/agents/{id}/heartbeat` |
| `/api/mc/spawn` | `/api/spawn` |

### Task Queue

**GET** `/api/mc/tasks/queue?agent=veronica&max_capacity=1`

Agents poll this to get their next assigned task.

| Param | Description |
|-------|-------------|
| `agent` | Agent ID (e.g. `veronica`, `bertha`). Can also be sent via `x-agent-name` or `x-agent-id` header. |
| `max_capacity` | (Optional) Max concurrent tasks (1–20, default 1). Used for `at_capacity` when agent has `>= max_capacity` active tasks. |

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

`reason` values (aligned with Mission Control):

| Value | Description |
|-------|-------------|
| `continue_current` | Agent has `current_task_id` and that task is `in_progress` or `review` — return it. |
| `assigned` | Next task assigned. |
| `at_capacity` | Agent has `>= max_capacity` active tasks; no new task. |
| `no_tasks_available` | No tasks in queue. |

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

## Authentication

When `MC_API_KEY` is set, all MC endpoints require:

- `Authorization: Bearer <key>` or
- `x-api-key: <key>`

When `MC_API_KEY` is not set, no auth is required.

## Using Mission Control as a Separate App

See **[MISSION_CONTROL_SETUP.md](MISSION_CONTROL_SETUP.md)** for full setup instructions.

**Quick start:**
```bash
git clone https://github.com/builderz-labs/mission-control.git
cd mission-control && pnpm install && cp .env.example .env
# Edit .env: OPENCLAW_GATEWAY_HOST, OPENCLAW_GATEWAY_PORT (same as Claw-Command)
pnpm dev   # http://localhost:3000
```

Mission Control connects to the same OpenClaw gateway as Claw-Command. Tasks you create in Claw-Command (and push to OpenClaw) appear in Mission Control's task board.

### Environment

| Variable | Description |
|----------|-------------|
| `MC_API_KEY` | (Optional) API key for MC endpoints. When set, agents must send it. |
| `MISSION_CONTROL_URL` | (Optional) Base URL of Mission Control. If set, Claw-Command can sync from it. |
| `CLAW_COMMAND_URL` | Base URL of Claw-Command. Use this when configuring Mission Control to pull tasks from Claw-Command. |

## Differences from Mission Control

| Feature | Mission Control | Claw-Command MC API |
|---------|-----------------|---------------------|
| Agent IDs | Integer | String (e.g. `veronica`) |
| Task IDs | Integer | String (e.g. `task-1`) |
| Auth | Session/API key | Optional API key via `MC_API_KEY` |
| Task queue `reason` | `continue_current`, `assigned`, `at_capacity`, `no_tasks_available` | Same ✓ |

## Example: Agent Polling

```bash
# Poll next task for Veronica (with optional max_capacity)
curl "https://your-claw-command.vercel.app/api/mc/tasks/queue?agent=veronica&max_capacity=1"

# Or use Mission Control path alias
curl "https://your-claw-command.vercel.app/api/tasks/queue?agent=veronica"

# Send heartbeat
curl -X POST "https://your-claw-command.vercel.app/api/mc/agents/veronica/heartbeat" \
  -H "Content-Type: application/json" \
  -d '{"status":"active","current_task":"task-1"}'

# With API key (when MC_API_KEY is set)
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-claw-command.vercel.app/api/mc/tasks/queue?agent=veronica"
```
