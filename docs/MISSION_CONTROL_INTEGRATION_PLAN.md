# Mission Control Full Integration Plan for Claw Command

> **Purpose:** Phased integration plan for bringing all Mission Control (builderz-labs/mission-control) features natively into Claw Command, transforming it from a domain dashboard with MC-compatible APIs into a full agent orchestration platform.
>
> **Reference:** [Mission Control Dashboard](https://github.com/builderz-labs/mission-control) — 28 feature panels, 66+ REST endpoints, WebSocket + SSE real-time, RBAC auth, 1.9k GitHub stars.
>
> **Scope:** 14 phases covering ~15 new DB tables, ~40 new API endpoints, ~12 new pages, and ~7 Zustand stores.

---

## Context

**Claw Command** is a Next.js 16 / React 19 / Tailwind CSS / Drizzle ORM (Postgres) dashboard for managing business operations (certifications, pipeline, tasks, brief, email, calendar) with OpenClaw agent integration. It already has a partial "Mission Control shell" at `/mission-control` with Kanban, Schedule, Memory Recall, and Dependencies panels, plus MC-compatible APIs (`/api/mc/tasks/queue`, `/api/mc/agents/{id}/heartbeat`, `/api/mc/spawn`).

**Mission Control** (github.com/builderz-labs/mission-control) is a standalone Next.js 16 / React 19 / SQLite / Zustand agent orchestration dashboard with 28 feature panels, 66+ REST endpoints, WebSocket + SSE real-time, RBAC auth, and deep OpenClaw gateway integration. Key features not yet in Claw Command are listed below.

**Goal:** Integrate every Mission Control feature into Claw Command so it becomes a single unified platform — no need to run Mission Control separately. Preserve all existing Claw Command domain features (certifications, pipeline, brief, email, calendar, docs, skyward). Adapt Mission Control's SQLite patterns to Claw Command's existing Drizzle/Postgres stack.

---

## Gap Analysis: Mission Control vs Claw Command

| MC Feature | Claw Command Status | Gap |
|------------|---------------------|-----|
| Overview dashboard (stats, health, audit) | Home page has ActiveOperations + Dependencies only | **Full build needed** |
| Agent management (list, detail, spawn, retire) | Agent cards exist, no dedicated page | **Page + detail panels needed** |
| Agent SOUL system | Not implemented | **Full build needed** |
| Inter-agent messaging | Not implemented | **Full build needed** |
| Kanban (6 columns, drag-and-drop) | TaskKanban exists (5 columns, no DnD) | **Upgrade needed** (add inbox col, DnD) |
| Quality review gates | `/api/tasks/{id}/approve` exists | **UI + workflow enhancement** |
| Task comments (threaded) | Comments API exists, no threads | **Add threading** |
| GitHub Issues sync | Not implemented | **Full build needed** |
| Real-time logs viewer | Not implemented | **Full build needed** |
| Sessions management | OpenClaw session RPC exists, no UI page | **Page needed** |
| Live feed sidebar | ActivityFlyout exists | **Enhance to match MC** |
| Token tracking (per-agent, per-model, charts) | Prometheus metrics only | **Major upgrade needed** |
| Claude session scanning | Not implemented | **Full build needed** |
| Cron job scheduler | Not implemented | **Full build needed** |
| Pipeline orchestration | Not implemented | **Full build needed** |
| Outbound webhooks | Not implemented | **Full build needed** |
| RBAC auth (viewer/operator/admin) | No auth system | **Full build needed** |
| Audit trail | Activities table exists | **Enhance for auth context** |
| Memory/knowledge base | MC Memory + Recall exists | **Enhance with categories, search** |
| Settings page | Not implemented | **Full build needed** |
| Multi-gateway support | Single gateway in env | **Full build needed** |
| Command palette (Cmd+K) | Not implemented | **Full build needed** |
| Notification center | Toast notifications exist | **Add persistent + bell icon** |
| Device identity (Ed25519) | Not implemented | **Full build needed** |
| Top status bar | CommandHeader exists | **Enhance with MC fields** |
| SSE/WebSocket real-time | SSE feed exists | **Enhance event types** |

**Summary:** 10 features need full builds, 8 need significant upgrades, 7 need minor enhancements.

---

## Phase 1: Overview Dashboard & System Health

### 1.1 Overview Page (`/overview` or enhance `/`)

Create an Overview dashboard matching Mission Control's main screen with:

- **Top stats bar:** Active Sessions (count / total), Agents Online (count / total), Tasks Running (count / total), Errors (24h)
- **System Health panel:** Gateway connection status, Memory usage %, Disk usage %, Uptime, DB Size, Error count
- **Security & Audit panel:** Audit events (24h/7d), Login failures (24h), Activities (24h), Webhooks configured, Unread notifications
- **Backup & Pipelines panel:** Latest backup timestamp, Active pipelines, Pipeline runs (24h), Tasks by status breakdown
- **Sessions panel:** Live list of active OpenClaw sessions with status indicators
- **Recent Logs panel:** Last N log entries from agents
- **Quick-action cards at bottom:** Spawn Agent, View Logs, Task Board, Memory, Orchestration

**Implementation notes:**
- Fetch system health from OpenClaw gateway via `rpc("system.status")` or equivalent
- Add `GET /api/overview/stats` endpoint aggregating data from tasks, agents, sessions, activities tables
- Use existing `src/lib/openclaw/client.ts` RPC helpers
- Add Zustand store for overview state with polling interval

### 1.2 Top Status Bar (Global)

Add a persistent top bar (like MC's) showing:
- App name + version
- Search (Cmd+K) command palette
- Sessions count, Gateway latency (ms), Events live indicator
- Clock, Chat toggle, Theme toggle, User avatar

**Files to modify:** `src/app/layout.tsx`, create `src/components/layout/TopBar.tsx`

---

## Phase 2: Agent Management

### 2.1 Agents Page (`/agents`)

Expand beyond the current agent cards to a full agent management page:

- **Agent list/grid view** with: name, emoji, status (online/idle/offline), current task, domain, last heartbeat, uptime
- **Agent detail panel** (click to expand): full status, session history, task history, token usage, SOUL config
- **Spawn agent button:** Form to spawn new agent session via OpenClaw
- **Agent registration:** Allow registering new agent identities (name, emoji, domain, capabilities)
- **Agent retirement:** Soft-delete / archive agents
- **Heartbeat monitoring:** Visual indicator of heartbeat freshness (green < 60s, yellow < 5m, red > 5m)

### 2.2 Agent SOUL System

Implement Mission Control's SOUL (personality/capability definition) system:

- **DB schema:** Add `agent_souls` table: `id, agent_id, personality TEXT, capabilities TEXT (JSON array), system_prompt TEXT, constraints TEXT, created_at, updated_at`
- **API:** `GET/POST/PATCH /api/agents/{id}/soul`
- **UI:** SOUL editor in agent detail panel — textarea for personality, tag input for capabilities, system prompt editor
- **Integration:** When spawning a session, inject SOUL config into the agent's system prompt

### 2.3 Inter-Agent Messaging

- **DB schema:** Add `agent_messages` table: `id, from_agent_id, to_agent_id, content TEXT, read_at, created_at`
- **API:** `GET /api/agents/{id}/messages`, `POST /api/agents/{id}/messages/send`
- **UI:** Chat interface between agents visible in agent detail panel
- **WebSocket:** Push new messages via SSE to connected dashboard clients

### 2.4 Agent Attribution

- **API:** `GET /api/agents/{id}/attribution` — returns what this agent created/modified (tasks, activities, docs)
- Self-scoped by default, `?privileged=1` for admin override
- Display in agent detail panel

---

## Phase 3: Enhanced Task Board

### 3.1 Full Kanban with Six Columns

Upgrade the existing `TaskKanban` to match MC's six-column workflow:

- **Columns:** Inbox -> Backlog -> Todo -> In Progress -> Review -> Done
- **Drag and drop** between columns (add `@hello-pangea/dnd` or similar)
- **Task cards** showing: title, priority badge, assignee avatar, due date, comment count, dependency indicator
- **Inline task creation** in any column
- **Bulk actions:** Multi-select tasks for batch status change, reassignment, or deletion

### 3.2 Quality Review Gates

Implement Mission Control's review gate system:

- Tasks in "Review" column require sign-off before moving to "Done"
- **API:** `POST /api/tasks/{id}/approve` (already exists), add `POST /api/tasks/{id}/request-review`
- **UI:** Review badge on task card, approval button in task detail modal
- **Notifications:** Alert task assignee and reviewer when review is requested/completed

### 3.3 Task Comments Enhancement

Already have `POST /api/tasks/{id}/comments`. Enhance with:

- **Threaded replies** (add `parent_comment_id` to comments)
- **Markdown support** in comments
- **@mentions** for agents and users
- **Activity log** per task showing all state changes

### 3.4 GitHub Issues Sync

- **Config:** `GITHUB_TOKEN`, `GITHUB_REPO` env vars
- **API:** `POST /api/tasks/sync/github` — sync tasks <-> GitHub issues
- **Mapping:** Task status -> GitHub labels, Agent assignment -> GitHub assignee
- **Webhook receiver:** `POST /api/webhooks/github` for incoming issue updates
- **UI:** GitHub icon on synced tasks, link to issue

---

## Phase 4: Real-Time Monitoring

### 4.1 Activity Feed (`/activity` — enhance existing)

Upgrade the existing activity page:

- **Live SSE stream** with real-time updates (enhance existing `/api/sse/feed`)
- **Filterable** by: agent, event type, resource type, time range
- **Activity types:** task_started, task_completed, task_reviewed, agent_spawned, agent_heartbeat, error, alert_fired, session_started, session_ended
- **Visual timeline** with agent avatars and color-coded event types

### 4.2 Logs Viewer (`/logs`)

New page for browsing agent logs:

- **DB schema:** Add `agent_logs` table: `id, agent_id, session_id, level (info|warn|error|debug), message TEXT, metadata TEXT (JSON), created_at`
- **API:** `GET /api/logs?agent={id}&level={level}&since={timestamp}&limit={n}`
- **UI:** Real-time log viewer with: agent filter, level filter, search, auto-scroll, pause/resume
- **Color-coded** log levels (green=info, yellow=warn, red=error, gray=debug)
- **Log ingestion:** Accept logs from OpenClaw agents via `POST /api/logs/ingest`

### 4.3 Sessions Panel (`/sessions`)

Dedicated sessions management page:

- **List all OpenClaw sessions** with: session_id, agent, status, created_at, duration, message count
- **Session detail:** Full message history, token usage, cost
- **Actions:** End session, restart, view logs
- **Auto-discovery:** Scan `~/.claude/projects/` for local Claude Code sessions (like MC does)
- **API:** `GET /api/sessions`, `GET /api/sessions/{id}`, `POST /api/sessions/{id}/end`

### 4.4 Live Feed Sidebar

Add a collapsible right sidebar (like MC's "Live Feed") showing:

- Real-time event stream
- Unread count badge
- Click to expand full event detail
- Available on all pages

---

## Phase 5: Token Tracking & Cost Management

### 5.1 Enhanced Tokens Page (`/tokens` — upgrade existing)

Expand beyond the current Prometheus metrics approach:

- **Per-agent token usage:** Table showing each agent's input/output tokens, cost
- **Per-model breakdown:** Token usage grouped by model (Claude Opus, Sonnet, Haiku, etc.)
- **Cost calculation:** Use model-specific pricing ($15/M input, $75/M output for Opus, etc.)
- **Charts:** Daily/weekly/monthly usage trends using Recharts
- **Budget alerts:** Set spending thresholds per agent or total, fire alerts when approaching
- **Session-level costs:** Cost breakdown per session
- **API:** `GET /api/tokens/summary`, `GET /api/tokens/by-agent`, `GET /api/tokens/by-model`, `GET /api/tokens/daily`
- **DB schema:** Add `token_usage` table: `id, agent_id, session_id, model TEXT, input_tokens INT, output_tokens INT, cost_cents INT, created_at`

### 5.2 Claude Session Token Scanning

Like MC, scan local Claude Code session JSONL transcripts:

- **Scanner:** `src/lib/tokens/claude-scanner.ts` — reads `~/.claude/projects/*/sessions/*.jsonl`
- **Extract:** Token counts and cost estimates from transcript metadata
- **Cron:** Run scan every 60 seconds via background task
- **API:** `GET /api/claude/sessions` — list discovered sessions with token data

---

## Phase 6: Automation & Scheduling

### 6.1 Cron Jobs (`/cron`)

New page for managing scheduled tasks:

- **DB schema:** Add `cron_jobs` table: `id, name TEXT, schedule TEXT (cron expression), action TEXT (JSON: endpoint + payload), enabled BOOLEAN, last_run_at, next_run_at, run_count INT, created_at`
- **API:** `GET/POST/PATCH/DELETE /api/cron`, `POST /api/cron/{id}/run` (manual trigger)
- **UI:** Cron job list with: name, schedule (human-readable), last run, next run, status, enable/disable toggle
- **Scheduler:** Background scheduler in `src/lib/scheduler.ts` — checks cron expressions and fires HTTP requests
- **Built-in jobs:** Sync agents (every 5m), scan Claude sessions (every 60s), check deadlines (every 1h), heartbeat check (every 2m)

### 6.2 Spawn Management (`/spawn` or within Agents)

Enhanced agent spawning:

- **Spawn form:** Select agent, enter task description, set priority, add context
- **Spawn templates:** Pre-configured spawn configurations for common tasks
- **Spawn history:** Log of all spawn requests with status
- **API:** Enhance existing `POST /api/mc/spawn` with template support

### 6.3 Pipeline Orchestration (`/orchestration`)

New workflow/pipeline system:

- **DB schema:** Add `pipelines` table: `id, name TEXT, description TEXT, steps TEXT (JSON array of step configs), status (draft|active|paused|completed), created_at, updated_at`
- **DB schema:** Add `pipeline_runs` table: `id, pipeline_id, status, started_at, completed_at, results TEXT (JSON)`
- **Step types:** spawn_agent, wait_for_task, http_request, conditional, parallel
- **API:** `GET/POST /api/pipelines`, `POST /api/pipelines/{id}/run`, `GET /api/pipelines/{id}/runs`
- **UI:** Visual pipeline builder with step cards, connections, and run status
- **Execution engine:** `src/lib/pipelines/executor.ts` — walks pipeline steps, spawns agents, waits for completions

---

## Phase 7: Webhooks & Integrations

### 7.1 Outbound Webhooks (`/webhooks`)

- **DB schema:** Add `webhooks` table: `id, name TEXT, url TEXT, events TEXT (JSON array of event types), secret TEXT (for HMAC signing), enabled BOOLEAN, created_at, updated_at`
- **DB schema:** Add `webhook_deliveries` table: `id, webhook_id, event_type, payload TEXT, status (pending|success|failed), response_code INT, response_body TEXT, attempts INT, next_retry_at, created_at`
- **API:** `GET/POST/PATCH/DELETE /api/webhooks`, `GET /api/webhooks/{id}/deliveries`
- **Delivery engine:** HMAC-SHA256 signed payloads, exponential backoff retry (max 5 attempts)
- **UI:** Webhook list, delivery history with status indicators, test webhook button
- **Events:** task_created, task_completed, agent_online, agent_offline, alert_fired, session_started, session_ended, pipeline_completed

### 7.2 Alerts System (`/alerts` — enhance existing)

Expand the existing alerts:

- **Alert rules:** Configurable conditions (deadline approaching, budget threshold, agent offline, error rate)
- **Alert channels:** Dashboard notification, webhook, email (via existing email system)
- **Alert history:** Full log of fired alerts with acknowledge/dismiss
- **API:** Enhance `GET/POST /api/alerts` with rule management
- **DB schema:** Add `alert_rules` table: `id, name TEXT, condition TEXT (JSON), channels TEXT (JSON), enabled BOOLEAN, last_fired_at, created_at`

---

## Phase 8: Authentication & Authorization (RBAC)

### 8.1 Auth System

Implement Mission Control's auth system:

- **DB schema:** Add `users` table: `id, username TEXT UNIQUE, password_hash TEXT, role (viewer|operator|admin), email TEXT, google_id TEXT, approved BOOLEAN, last_login_at, created_at`
- **DB schema:** Add `sessions_auth` table: `id, user_id, token TEXT UNIQUE, expires_at, created_at`
- **Auth methods:**
  - Username/password with scrypt hashing
  - Session cookies (7-day expiry)
  - API key via `x-api-key` header (for agent/automation access)
  - Optional Google Sign-In with admin approval workflow
- **Middleware:** `src/middleware.ts` — check auth on all routes except `/api/auth/*` and public assets

### 8.2 Role-Based Access Control

- **Viewer:** Read-only access to all dashboards and data
- **Operator:** Read/write for tasks, agents, chat, spawn
- **Admin:** Full access including user management, settings, webhooks, cron, pipelines
- **API decorator:** `withRole("admin")` wrapper for protected endpoints
- **UI:** Show/hide action buttons based on role, admin-only settings page

### 8.3 Audit Trail

- **DB schema:** Add `audit_events` table: `id, user_id, action TEXT, resource_type TEXT, resource_id TEXT, details TEXT (JSON), ip_address TEXT, created_at`
- **Log:** All create/update/delete operations, login/logout, permission changes
- **API:** `GET /api/audit?user={id}&action={type}&since={date}`
- **UI:** Audit log viewer in admin settings

---

## Phase 9: Memory & Knowledge Base

### 9.1 Enhanced Memory System (`/memory`)

Upgrade the existing MC memory to a full knowledge base:

- **Categorization:** Memory items with categories (fact, procedure, preference, context)
- **Tags:** Multiple tags per memory item for filtering
- **Search:** Full-text search across all memories (use Postgres `tsvector` or LIKE)
- **Agent-scoped memory:** Filter memories by agent domain
- **Memory timeline:** Visual timeline of when memories were created
- **Import/Export:** Bulk import from markdown files, export as JSON

### 9.2 Recall API Enhancement

Upgrade existing `GET /api/mission-control/recall?q=`:

- **Semantic matching:** Score results by relevance (keyword frequency, recency, source authority)
- **Context window:** Return surrounding memories for context
- **Auto-recall:** Agents automatically recall relevant memories when starting tasks

---

## Phase 10: Configuration & Settings

### 10.1 Settings Page (`/settings`)

Admin-only settings dashboard:

- **Gateway configuration:** OpenClaw URL, port, connection test
- **Auth settings:** Default role, session duration, allowed hosts
- **Notification preferences:** Which events trigger notifications
- **Theme:** Dark/light mode toggle (persist in user preferences)
- **API keys:** Generate/revoke API keys for automation
- **Database:** Current size, run migrations, export data

### 10.2 Multi-Gateway Support

- **DB schema:** Add `gateways` table: `id, name TEXT, url TEXT, status (online|offline|unknown), last_check_at, created_at`
- **API:** `GET/POST/DELETE /api/gateways`, `POST /api/gateways/{id}/check`
- **UI:** Gateway list with status indicators, add/remove gateways
- **Routing:** Route agent spawns to specific gateways based on load or agent affinity

### 10.3 Device Identity

Like MC, implement Ed25519 cryptographic identity:

- **Generate** keypair on first run, store in `.data/device-identity.json`
- **Use** for secure gateway handshake and webhook signing
- **API:** `GET /api/device/identity` (public key only)

---

## Phase 11: Navigation & Layout Overhaul

### 11.1 Sidebar Navigation Update

Update `src/components/layout/Navigation.tsx` to match MC's nav structure:

```
Vorentoe (brand)
---
Overview
Agents
Tasks
Sessions
---
OBSERVE
  Activity
  Logs
  Tokens
  Memory
---
AUTOMATE
  Cron
  Spawn
  Webhooks
  Alerts
---
DOMAIN (Claw Command originals)
  Brief
  Pipeline
  Certifications
  Calendar
  Email
  Docs
---
ADMIN
  Settings
  Users
```

### 11.2 Command Palette (Cmd+K)

Global search/command palette:

- **Keyboard shortcut:** Cmd+K / Ctrl+K
- **Search:** Tasks, agents, memories, sessions, pages
- **Quick actions:** Spawn agent, create task, add memory, navigate
- **Component:** `src/components/layout/CommandPalette.tsx`

### 11.3 Notification Center

- **Bell icon** in top bar with unread count
- **Dropdown panel** showing recent notifications
- **Mark as read** individually or all
- **DB schema:** Add `notifications` table: `id, user_id, title TEXT, body TEXT, type TEXT, resource_url TEXT, read_at, created_at`

---

## Phase 12: Database Schema Additions

All new tables in `src/lib/db/schema.ts` using Drizzle ORM for Postgres:

```typescript
// New tables to add (summary):
// - users (auth)
// - sessions_auth (auth sessions)
// - agent_souls (SOUL system)
// - agent_messages (inter-agent chat)
// - agent_logs (log ingestion)
// - token_usage (cost tracking)
// - cron_jobs (scheduler)
// - pipelines (orchestration)
// - pipeline_runs
// - webhooks
// - webhook_deliveries
// - alert_rules
// - audit_events
// - notifications
// - gateways (multi-gateway)
```

Create Drizzle migration: `drizzle/migrations/0003_mission_control_full.sql`

---

## Phase 13: State Management

Add Zustand stores (matching MC's approach):

- `src/lib/stores/overviewStore.ts` — system stats, health
- `src/lib/stores/agentStore.ts` — agent list, selection, SOUL
- `src/lib/stores/sessionStore.ts` — active sessions
- `src/lib/stores/logStore.ts` — log entries with filters
- `src/lib/stores/tokenStore.ts` — token usage data
- `src/lib/stores/notificationStore.ts` — unread notifications
- `src/lib/stores/pipelineStore.ts` — pipeline definitions and runs

Add `zustand` to dependencies: `npm install zustand`

---

## Phase 14: Real-Time Infrastructure

### 14.1 WebSocket Client

Create `src/lib/ws/gateway-client.ts`:

- Connect to OpenClaw gateway WebSocket
- Subscribe to: agent status changes, session events, task updates, log streams
- Auto-reconnect with exponential backoff
- Dispatch events to Zustand stores

### 14.2 Enhanced SSE

Upgrade existing `/api/sse/feed`:

- Add event types: `agent_status`, `session_event`, `log_entry`, `token_update`, `pipeline_progress`
- Support `Last-Event-ID` for resumption
- Client-side: `src/lib/hooks/useEventStream.ts` with reconnection logic

---

## Implementation Priority Order

| Priority | Phase | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Phase 11 (Nav + Layout) | Medium | High — Sets the foundation for all new pages |
| 2 | Phase 1 (Overview Dashboard) | Medium | High — Immediate visual impact, shows system status |
| 3 | Phase 2 (Agent Management) | Large | High — Core orchestration feature |
| 4 | Phase 3 (Enhanced Task Board) | Medium | High — Drag-and-drop, review gates |
| 5 | Phase 4 (Real-Time Monitoring) | Large | High — Logs, sessions, live feed |
| 6 | Phase 5 (Token Tracking) | Medium | Medium — Cost visibility |
| 7 | Phase 12 (DB Schema) | Medium | Required — Foundation for phases 6-10 |
| 8 | Phase 6 (Automation) | Large | Medium — Cron, pipelines |
| 9 | Phase 7 (Webhooks) | Medium | Medium — External integrations |
| 10 | Phase 8 (Auth/RBAC) | Large | Medium — Security (can defer if single-user) |
| 11 | Phase 9 (Memory) | Small | Medium — Enhance existing |
| 12 | Phase 10 (Settings) | Medium | Low — Admin convenience |
| 13 | Phase 13 (State/Zustand) | Medium | Required — Wire up new stores as pages are built |
| 14 | Phase 14 (WebSocket) | Medium | High — Real-time foundation |

---

## Dependencies to Add

```bash
npm install zustand recharts @hello-pangea/dnd zod
```

---

## Environment Variables (New)

```env
# Auth
AUTH_USER=admin
AUTH_PASS=your-secure-password
SESSION_SECRET=random-32-char-string

# GitHub Sync
GITHUB_TOKEN=ghp_...
GITHUB_REPO=owner/repo

# Multi-gateway
GATEWAY_2_URL=http://another-gateway:18789

# Budget
TOKEN_BUDGET_MONTHLY_USD=500
TOKEN_ALERT_THRESHOLD_PCT=80

# Claude session scanning
CLAUDE_PROJECTS_DIR=~/.claude/projects
```

---

## What Already Exists in Claw Command (Do Not Duplicate)

- Task CRUD + Kanban (`/tasks`, `/api/tasks/*`)
- Agent cards + heartbeat (`/api/agents/*`, `/api/mc/agents/*/heartbeat`)
- MC-compatible task queue (`/api/mc/tasks/queue`)
- MC spawn (`/api/mc/spawn`)
- Activity feed (`/activity`, `/api/activities/*`)
- Alerts (`/api/alerts/*`)
- Token page (`/tokens`, `/api/tokens`)
- Mission Control shell (`/mission-control` with Kanban, Schedule, Memory, Dependencies)
- Chat flyout + agent chat (`/chat`, `/api/chat/*`)
- SSE feed (`/api/sse/feed`)
- OpenClaw RPC client (`src/lib/openclaw/client.ts`)
- Extension bridge (`src/lib/mission-control/extensionBridge.ts`)
- Email automation (`/email`, `/api/email/*`)
- Calendar (`/calendar`, `/api/calendar/*`)
- Certifications (`/certifications`, `/api/certifications/*`)
- Pipeline (`/pipeline`, `/api/opportunities/*`, `/api/applications/*`)
- Brief (`/brief`, `/api/brief`)
- Docs (`/docs`, `/api/docs`)
- Drizzle ORM schema with 15+ tables

---

## Testing Strategy

- **Unit tests:** New API endpoints with Vitest
- **E2E tests:** Key workflows with Playwright (spawn agent, create task, move through Kanban, review gate, check token usage)
- **Smoke test:** Expand `scripts/smoke-test-mc-api.sh` to cover all new endpoints
- **Load test:** Verify SSE/WebSocket handles 50+ concurrent connections
