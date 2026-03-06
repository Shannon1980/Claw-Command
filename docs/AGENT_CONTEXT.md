# Agent Context Integration

OpenClaw agents can pull live data from Claw Command (certifications, tasks, alerts) via the **Agent Context API**.

## Endpoint

```
GET /api/agent-context
```

### Query Parameters

| Param     | Description                                                                 |
| --------- | --------------------------------------------------------------------------- |
| `agentId` | Optional. Filter tasks to those assigned to this agent (e.g. `veronica`).   |
| `scope`   | `certifications` (certs only) or `all` (default: certs + alerts + tasks).   |
| `format`  | `text` (default, prompt-ready) or `json` (structured).                      |

### Examples

**Certifications only (plain text for prompts):**
```
GET /api/agent-context?scope=certifications
```

**Full context for agent Veronica:**
```
GET /api/agent-context?agentId=veronica&scope=all&format=text
```

**Structured JSON:**
```
GET /api/agent-context?agentId=bertha&format=json
```

## Response Formats

### Text (default)

Returns a plain-text summary suitable for injection into agent system prompts:

```
## Certifications (Vorentoe LLC)

- 8(a) Program (Federal/SBA): NOT_STARTED
  Note: Needs eligibility verification
  Documents: 0/5 completed

- Maryland MBE (State/MDOT): SUBMITTED
  Due: 2026-03-07
  Applied: 2026-02-15
  Decision expected: 2026-04-15
  Documents: 3/5 completed

## Active Alerts

- [critical] MBE Certification deadline approaching (due 2026-03-06)
- [warning] VA proposal pricing review overdue (due 2026-03-08)

## Your Assigned Tasks

- [in_progress] Complete 8(a) certification application (due 2026-03-15) [needs Shannon approval]
- [blocked] Approve MBE certification documents (due 2026-03-06) [needs Shannon approval]
```

### JSON

```json
{
  "certifications": [...],
  "alerts": [...],
  "tasks": [...],
  "agentId": "veronica",
  "timestamp": "2026-03-04T12:00:00.000Z"
}
```

## Task Push Integration

When a task is assigned to an agent in Claw Command, the push to OpenClaw includes a `context_url`:

```
context_url: https://your-app.vercel.app/api/agent-context?agentId=veronica&scope=all&format=text
```

OpenClaw can fetch this URL when spawning a session to inject the context into the agent’s system prompt or tool context.

## OpenClaw Tool Configuration

To use this from an OpenClaw agent, add a tool that fetches the context URL:

```yaml
# Example tool definition
- name: get_claw_context
  description: Fetch current certifications, alerts, and tasks from Claw Command
  url: "{{CLAW_COMMAND_URL}}/api/agent-context?agentId={{agent_id}}&scope=all&format=text"
  method: GET
```

Or call it from agent code:

```python
import requests
url = f"{CLAW_COMMAND_URL}/api/agent-context?agentId={agent_id}&scope=all&format=text"
context = requests.get(url).text
# Inject into system prompt or use for context
```

## Environment Variables

- `NEXT_PUBLIC_APP_URL` – Base URL for Claw Command (for `context_url` in task push)
- `VERCEL_URL` – Used as fallback when `NEXT_PUBLIC_APP_URL` is not set
