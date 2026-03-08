# Mission Control Integration — Build Plan

> **Approach:** Best implementation wins. Override Claw Command code when Mission Control's approach is superior. Keep domain-specific features. Delete mock data. Unify into one platform.
>
> **Stack:** Next.js 16 / React 19 / Tailwind CSS / Drizzle ORM (Postgres) / Zustand / SSE

---

## Sprint 0 — Foundation (DB + Dependencies + Cleanup)

**Goal:** Lay the groundwork before building any features. Schema migrations, new dependencies, state management scaffolding, mock data removal plan.

### 0.1 Database Migration

Add all new tables to `src/lib/db/schema.ts` via Drizzle migration `drizzle/migrations/0003_mission_control_full.sql`.

**New tables:**
| Table | Purpose | Ref |
|-------|---------|-----|
| `users` | Auth: username, password_hash, role (viewer/operator/admin), email | Phase 8.1 |
| `sessions_auth` | Auth sessions: user_id, token, expires_at | Phase 8.1 |
| `agent_souls` | SOUL system: personality, capabilities, system_prompt, constraints | Phase 2.2 |
| `agent_messages` | Inter-agent messaging: from/to agent, content, read_at | Phase 2.3 |
| `agent_logs` | Log ingestion: agent_id, session_id, level, message, metadata | Phase 4.2 |
| `token_usage` | Cost tracking: agent_id, session_id, model, input/output tokens, cost_cents | Phase 5.1 |
| `cron_jobs` | Scheduler: name, schedule (cron expr), action (JSON), enabled, run counts | Phase 6.1 |
| `pipelines` | Orchestration: name, steps (JSON), status | Phase 6.3 |
| `pipeline_runs` | Pipeline executions: pipeline_id, status, started_at, results | Phase 6.3 |
| `webhooks` | Outbound webhooks: url, events, secret (HMAC), enabled | Phase 7.1 |
| `webhook_deliveries` | Delivery log: webhook_id, payload, status, response, retries | Phase 7.1 |
| `alert_rules` | Configurable alert rules: condition (JSON), channels, enabled | Phase 7.2 |
| `audit_events` | Audit trail: user_id, action, resource, ip_address | Phase 8.3 |
| `notifications` | Notification center: user_id, title, body, type, read_at | Phase 11.3 |
| `gateways` | Multi-gateway: name, url, status, last_check_at | Phase 10.2 |

**Schema alterations (existing tables):**
| Table | Add Columns | Ref |
|-------|-------------|-----|
| `tasks` | `outcome TEXT`, `project TEXT`, `ticket_ref TEXT`, `description TEXT` | Override/Merge |
| `tasks` | Update `status` enum: add `inbox`, `quality_review` | Override/Merge |
| `agents` | `soul TEXT`, `capabilities TEXT (JSON)`, `api_key TEXT`, `retired_at TEXT` | Override/Merge |

**Deliverables:**
- [ ] `src/lib/db/schema.ts` — add all 15 new table definitions + alter existing tables
- [ ] `drizzle/migrations/0003_mission_control_full.sql` — generated migration
- [ ] Run migration against dev DB, verify all tables created

### 0.2 Install Dependencies ✓

```bash
npm install zustand recharts @hello-pangea/dnd zod @xyflow/react pino
```

> **Status:** Done. `zustand`, `@hello-pangea/dnd`, `zod`, and `pino` are installed (see `package.json`). `recharts` and `@xyflow/react` to be added when their respective sprints begin.

### 0.3 Zustand Store Scaffolding

Create store files with initial types and empty implementations:

- [ ] `src/lib/stores/overviewStore.ts` — system stats, health
- [ ] `src/lib/stores/agentStore.ts` — agent list, selection, SOUL, lifecycle
- [ ] `src/lib/stores/taskStore.ts` — task list, optimistic mutations, filters
- [ ] `src/lib/stores/sessionStore.ts` — active OpenClaw sessions
- [ ] `src/lib/stores/logStore.ts` — log entries with level/agent filters
- [ ] `src/lib/stores/tokenStore.ts` — token usage, cost data, budget
- [ ] `src/lib/stores/notificationStore.ts` — unread notifications, bell state
- [ ] `src/lib/stores/pipelineStore.ts` — pipeline definitions and runs
- [ ] `src/lib/stores/eventBus.ts` — central SSE event dispatcher to all stores

### 0.4 Event Bus + SSE Infrastructure

**Replace** `src/app/api/sse/feed/route.ts` (currently a stub with one demo event).

- [ ] Create `src/lib/events/eventBus.ts` — in-process pub/sub (EventEmitter or custom)
- [ ] Rewrite `/api/sse/feed` to: subscribe to event bus, stream typed events, support `Last-Event-ID`
- [ ] Event types: `agent_status`, `task_update`, `session_event`, `log_entry`, `token_update`, `pipeline_progress`, `notification`, `alert_fired`
- [ ] Create `src/lib/hooks/useEventStream.ts` — client-side SSE with auto-reconnect, dispatches to Zustand stores

---

## Sprint 1 — Navigation + Layout Overhaul

**Goal:** Restructure the app shell so all new pages have a home. Remove the separate `/mission-control` sidecar.

> Ref: Phase 11 (Priority 1 in integration plan)

### 1.1 Sidebar Navigation

Rewrite `src/components/layout/Navigation.tsx`:

```
COMMAND
  Overview          (new — Sprint 2)
  Agents            (new — Sprint 3)
  Tasks             (override — Sprint 4)
  Sessions          (new — Sprint 5)
---
OBSERVE
  Activity          (upgrade — Sprint 5)
  Logs              (new — Sprint 5)
  Tokens            (override — Sprint 6)
  Memory            (upgrade — Sprint 9)
---
AUTOMATE
  Cron              (new — Sprint 7)
  Spawn             (enhance — Sprint 7)
  Pipelines         (new — Sprint 7)
  Webhooks          (new — Sprint 8)
  Alerts            (override — Sprint 8)
---
DOMAIN
  Brief             (keep)
  Pipeline          (keep — BD pipeline)
  Certifications    (keep)
  Calendar          (keep)
  Email             (keep)
  Docs              (keep)
---
ADMIN
  Settings          (new — Sprint 10)
  Users             (new — Sprint 10)
```

- [ ] Update `Navigation.tsx` with grouped sections and new routes
- [ ] Add active route highlighting per group
- [ ] Collapse/expand group sections

### 1.2 Top Status Bar

Create `src/components/layout/TopBar.tsx`:

- [ ] App name + version badge
- [ ] Cmd+K search trigger (wired in Sprint 1.3)
- [ ] Live indicators: sessions count, gateway latency, events pulse
- [ ] Clock, chat toggle, theme toggle, user avatar (placeholder until auth)

### 1.3 Command Palette (Cmd+K)

Create `src/components/layout/CommandPalette.tsx`:

- [ ] Keyboard shortcut: Cmd+K / Ctrl+K
- [ ] Search: tasks, agents, memories, sessions, pages
- [ ] Quick actions: spawn agent, create task, add memory, navigate
- [ ] Fuzzy match with keyboard navigation

### 1.4 Remove MC Shell Sidecar

- [ ] Delete `src/app/mission-control/` directory
- [ ] Move any unique MC components into `src/components/` (MC_KanbanBoard -> merged into TaskKanban, MC_SchedulePanel -> merged into Calendar, MC_MemoryRecall -> merged into Memory page, MC_Dependencies -> merged into Tasks)
- [ ] Remove `/mission-control` from navigation
- [ ] Delete `src/dashboards/mission-control/` if present

### 1.5 Notification Center

- [ ] Bell icon in TopBar with unread count badge
- [ ] Dropdown panel showing recent notifications from `notifications` table
- [ ] Mark as read (individual + all)
- [ ] `GET /api/notifications`, `PATCH /api/notifications/{id}/read`, `POST /api/notifications/read-all`

**Sprint 1 Deliverables:** New nav structure, top bar, Cmd+K palette, notification bell, MC shell removed.

---

## Sprint 2 — Overview Dashboard

**Goal:** Build the main overview page replacing the basic home page.

> Ref: Phase 1 (Priority 2)

### 2.1 Overview Page (`/` or `/overview`)

- [ ] `GET /api/overview/stats` — aggregates from tasks, agents, sessions, activities, token_usage
- [ ] Top stats cards: Active Sessions, Agents Online, Tasks Running, Errors (24h)
- [ ] System Health panel: gateway status (via OpenClaw RPC), memory %, disk %, uptime, DB size, error count
- [ ] Security & Audit panel: audit events (24h/7d), login failures, webhook count, unread notifications
- [ ] Sessions panel: live list from `sessionStore`
- [ ] Recent Logs panel: last N entries from `logStore`
- [ ] Quick-action cards: Spawn Agent, View Logs, Task Board, Memory, Orchestration

### 2.2 Overview Zustand Store

- [ ] `overviewStore.ts` — fetch stats on mount, refresh via SSE `system_health` events
- [ ] Health check polling (gateway RPC) every 30s as fallback

**Sprint 2 Deliverables:** Full overview dashboard with live stats, system health, quick actions.

---

## Sprint 3 — Agent Management

**Goal:** Replace GET-only agent API with full lifecycle. Build dedicated agents page.

> Ref: Phase 2 (Priority 3). **OVERRIDE** existing `/api/agents/route.ts`.

### 3.1 Agent API (Override)

Replace `src/app/api/agents/route.ts` and add sub-routes:

- [ ] `GET /api/agents` — list all agents from DB (remove mock-chat fallback)
- [ ] `POST /api/agents` — register new agent (name, emoji, domain, capabilities)
- [ ] `GET /api/agents/{id}` — agent detail with SOUL, tasks, messages, token usage
- [ ] `PATCH /api/agents/{id}` — update agent fields
- [ ] `POST /api/agents/{id}/heartbeat` — update last_seen, status (upgrade existing MC endpoint)
- [ ] `POST /api/agents/{id}/retire` — soft-delete (set `retired_at`)
- [ ] `GET /api/agents/{id}/attribution` — tasks/activities created by this agent
- [ ] All mutations validated with Zod schemas

### 3.2 Agent SOUL System

- [ ] `GET /api/agents/{id}/soul` — get SOUL config
- [ ] `POST /api/agents/{id}/soul` — create/update SOUL
- [ ] SOUL editor UI in agent detail: personality textarea, capabilities tag input, system prompt editor
- [ ] Inject SOUL into system prompt when spawning via `/api/mc/spawn`

### 3.3 Inter-Agent Messaging

- [ ] `GET /api/agents/{id}/messages` — messages to/from this agent
- [ ] `POST /api/agents/{id}/messages/send` — send message (from_agent_id, content)
- [ ] Push new messages through SSE event bus
- [ ] Chat interface in agent detail panel

### 3.4 Agents Page (`/agents`)

- [ ] Agent list/grid view: name, emoji, status indicator, current task, domain, heartbeat freshness
- [ ] Heartbeat freshness: green < 60s, yellow < 5m, red > 5m
- [ ] Click to expand agent detail panel (SOUL, task history, token usage, messages)
- [ ] Spawn button, retire button
- [ ] Agent registration form
- [ ] `agentStore.ts` — SSE-driven, optimistic updates

**Sprint 3 Deliverables:** Full agent CRUD, SOUL system, inter-agent messaging, agents page.

---

## Sprint 4 — Enhanced Task Board

**Goal:** Replace existing Kanban with MC-quality DnD board. Replace raw pg queries with Drizzle+Zod.

> Ref: Phase 3 (Priority 4). **OVERRIDE** `TaskKanban.tsx` and `/api/tasks/route.ts`.

### 4.1 Task API (Override)

Replace `src/app/api/tasks/route.ts`:

- [ ] Rewrite with Drizzle ORM queries (remove raw `pg.Pool`)
- [ ] Zod validation on POST/PATCH
- [ ] Support new statuses: `inbox, backlog, in_progress, review, quality_review, blocked, done`
- [ ] New fields: `outcome`, `project`, `ticket_ref`, `description`
- [ ] Keep domain FK fields: `parentOpportunityId`, `parentApplicationId`, `dependsOnShannon`
- [ ] Emit `task_update` events to event bus on all mutations

### 4.2 Kanban Board (Override)

Replace `src/components/tasks/TaskKanban.tsx`:

- [ ] 7 columns: Inbox, Backlog, In Progress, Review, Quality Review, Blocked, Done
- [ ] `@hello-pangea/dnd` for smooth drag-and-drop
- [ ] Task cards: title, priority badge, assignee avatar, due date, comment count, dependency indicator
- [ ] Inline task creation in any column
- [ ] Bulk actions: multi-select for batch status change, reassign, delete
- [ ] `taskStore.ts` — SSE-driven, optimistic drag updates

### 4.3 Quality Review Gates

- [ ] Tasks in "Review" require sign-off to move to "Done" or "Quality Review"
- [ ] `POST /api/tasks/{id}/request-review` — sets status to `review`, notifies reviewer
- [ ] `POST /api/tasks/{id}/approve` — (enhance existing) moves to `done`, logs activity
- [ ] Review badge on task card, approval button in modal

### 4.4 Task Comments Enhancement

- [ ] Add `parent_comment_id` to task_comments for threading
- [ ] Markdown rendering in comments
- [ ] @mentions for agents (autocomplete from agent list)
- [ ] Activity log per task showing all state changes

### 4.5 GitHub Issues Sync

- [ ] `POST /api/tasks/sync/github` — bidirectional sync tasks <-> GitHub issues
- [ ] `POST /api/webhooks/github` — incoming webhook receiver for GitHub events
- [ ] Task status -> GitHub labels mapping
- [ ] GitHub icon on synced task cards, link to issue

**Sprint 4 Deliverables:** New Kanban with DnD, Zod-validated API, review gates, threaded comments, GitHub sync.

---

## Sprint 5 — Real-Time Monitoring

**Goal:** Build logs viewer, sessions page, upgrade activity feed. All SSE-connected.

> Ref: Phase 4 (Priority 5). **OVERRIDE** activity feed, **NEW** logs + sessions.

### 5.1 Activity Feed (Override/Upgrade)

Replace `src/app/api/activities/route.ts`:

- [ ] Filterable by: agent, event type, resource type, time range
- [ ] Cursor-based pagination
- [ ] SSE push on new events (subscribe to event bus)
- [ ] Expanded event types: task_started, task_completed, task_reviewed, agent_spawned, agent_heartbeat, error, alert_fired, session_started, session_ended
- [ ] Visual timeline with agent avatars and color-coded types

### 5.2 Logs Viewer (`/logs`)

- [ ] `POST /api/logs/ingest` — accept logs from agents (agent_id, session_id, level, message, metadata)
- [ ] `GET /api/logs?agent={id}&level={level}&since={ts}&limit={n}` — query with filters
- [ ] UI: real-time log viewer with agent filter, level filter (info/warn/error/debug), search, auto-scroll, pause/resume
- [ ] Color-coded: green=info, yellow=warn, red=error, gray=debug
- [ ] `logStore.ts` — SSE `log_entry` events, circular buffer for performance

### 5.3 Sessions Page (`/sessions`)

- [ ] `GET /api/sessions` — list all OpenClaw sessions (via RPC + local scan)
- [ ] `GET /api/sessions/{id}` — session detail: messages, token usage, cost
- [ ] `POST /api/sessions/{id}/end` — terminate session
- [ ] Auto-discovery: scan `~/.claude/projects/` for Claude Code sessions
- [ ] Session list: session_id, agent, status, created_at, duration, message count
- [ ] `sessionStore.ts` — SSE `session_event` updates

### 5.4 Live Feed Sidebar

- [ ] Collapsible right sidebar available on all pages
- [ ] Real-time event stream from SSE
- [ ] Unread count badge
- [ ] Click to expand event detail

**Sprint 5 Deliverables:** Filterable activity feed, logs viewer, sessions page, live sidebar.

---

## Sprint 6 — Token Tracking & Cost Management

**Goal:** Replace Prometheus-only token tracking with full per-agent/model/session cost system.

> Ref: Phase 5 (Priority 6). **OVERRIDE** `/api/tokens/route.ts`.

### 6.1 Token API (Override)

Replace `src/app/api/tokens/route.ts`:

- [ ] `GET /api/tokens/summary` — total usage, cost, budget remaining
- [ ] `GET /api/tokens/by-agent` — per-agent breakdown
- [ ] `GET /api/tokens/by-model` — per-model breakdown (Opus, Sonnet, Haiku)
- [ ] `GET /api/tokens/daily?days=30` — daily aggregates for charts
- [ ] `POST /api/tokens/record` — record token usage (called by agents/gateway)
- [ ] Cost calculation with model-specific pricing
- [ ] Budget alerts: fire when usage exceeds `TOKEN_ALERT_THRESHOLD_PCT`

### 6.2 Tokens Page (`/tokens` — override)

- [ ] Summary cards: total tokens, total cost, budget used %, budget remaining
- [ ] Recharts line chart: daily usage over 30 days
- [ ] Per-agent table with sparklines
- [ ] Per-model pie chart
- [ ] Budget threshold configuration
- [ ] `tokenStore.ts` — SSE `token_update` events

### 6.3 Claude Session Scanning

- [ ] `src/lib/tokens/claude-scanner.ts` — read `~/.claude/projects/*/sessions/*.jsonl`
- [ ] Extract token counts and cost estimates from transcript metadata
- [ ] `GET /api/claude/sessions` — list discovered sessions with token data
- [ ] Run via cron job (every 60s) once cron system is built (Sprint 7)

**Sprint 6 Deliverables:** Full token tracking with charts, per-agent/model breakdown, budget alerts, session scanning.

---

## Sprint 7 — Automation & Scheduling

**Goal:** Build cron scheduler, enhance spawn, build pipeline orchestration.

> Ref: Phase 6 (Priority 8)

### 7.1 Cron Jobs (`/cron`)

- [ ] `GET/POST/PATCH/DELETE /api/cron` — CRUD for cron jobs
- [ ] `POST /api/cron/{id}/run` — manual trigger
- [ ] `src/lib/scheduler.ts` — background scheduler checking cron expressions, firing HTTP requests
- [ ] Built-in jobs: sync agents (5m), scan Claude sessions (60s), check deadlines (1h), heartbeat check (2m)
- [ ] UI: cron list with name, schedule (human-readable), last/next run, enable/disable toggle

### 7.2 Enhanced Spawn Management

- [ ] Upgrade existing `POST /api/mc/spawn` with template support
- [ ] Spawn templates: pre-configured spawn configs for common tasks
- [ ] Spawn form: select agent, task description, priority, context, SOUL injection
- [ ] Spawn history log

### 7.3 Pipeline Orchestration (`/orchestration`)

- [ ] `GET/POST /api/pipelines` — CRUD for pipeline definitions
- [ ] `POST /api/pipelines/{id}/run` — execute pipeline
- [ ] `GET /api/pipelines/{id}/runs` — list runs with status
- [ ] Step types: `spawn_agent`, `wait_for_task`, `http_request`, `conditional`, `parallel`
- [ ] `src/lib/pipelines/executor.ts` — walks steps, spawns agents, waits for completions
- [ ] UI: visual pipeline builder with `@xyflow/react` (React Flow)
- [ ] `pipelineStore.ts` — SSE `pipeline_progress` events

**Sprint 7 Deliverables:** Cron scheduler, spawn templates, pipeline orchestration with visual builder.

---

## Sprint 8 — Webhooks & Alerts

**Goal:** Build outbound webhook system, replace mock alerts with rule engine.

> Ref: Phase 7 (Priority 9). **OVERRIDE** alerts.

### 8.1 Outbound Webhooks (`/webhooks`)

- [ ] `GET/POST/PATCH/DELETE /api/webhooks` — webhook CRUD
- [ ] `GET /api/webhooks/{id}/deliveries` — delivery history
- [ ] `POST /api/webhooks/{id}/test` — send test payload
- [ ] Delivery engine: HMAC-SHA256 signed payloads, exponential backoff retry (max 5)
- [ ] Events: task_created, task_completed, agent_online, agent_offline, alert_fired, session_started, session_ended, pipeline_completed
- [ ] UI: webhook list, delivery history, test button

### 8.2 Alert Rules (Override)

Replace `src/app/api/alerts/route.ts` and delete `src/lib/mock-alerts.ts`:

- [ ] `GET/POST/PATCH/DELETE /api/alert-rules` — rule CRUD
- [ ] Rule conditions: deadline approaching, budget threshold, agent offline > N min, error rate > N
- [ ] Alert channels: dashboard notification, webhook, email (via existing email system)
- [ ] Alert firing engine in event bus — evaluate rules on relevant events
- [ ] Alert history with acknowledge/dismiss
- [ ] `GET /api/alerts` — fired alerts (keep existing path, new internals)

**Sprint 8 Deliverables:** Webhook system with HMAC signing, rule-based alerts replacing mock data.

---

## Sprint 9 — Memory & Knowledge Base

**Goal:** Upgrade existing MC memory into a categorized, searchable knowledge base.

> Ref: Phase 9 (Priority 11)

### 9.1 Memory Page (`/memory`)

- [ ] Categorization: fact, procedure, preference, context
- [ ] Tags: multiple tags per memory, tag-based filtering
- [ ] Full-text search (Postgres `tsvector` or `ILIKE`)
- [ ] Agent-scoped memory filtering
- [ ] Memory timeline visualization
- [ ] Import/export: bulk import from markdown, export as JSON

### 9.2 Recall API Enhancement

- [ ] Upgrade `GET /api/mission-control/recall?q=` with relevance scoring
- [ ] Context window: return surrounding memories
- [ ] Auto-recall: agents automatically recall relevant memories when starting tasks

**Sprint 9 Deliverables:** Categorized memory system with search, tags, import/export.

---

## Sprint 10 — Auth, Settings, Multi-Gateway

**Goal:** Add RBAC auth, settings page, multi-gateway support.

> Ref: Phases 8 + 10 (Priority 10, 12)

### 10.1 Auth System

- [ ] Username/password with scrypt hashing
- [ ] Session cookies (7-day expiry) in `sessions_auth` table
- [ ] API key via `x-api-key` header (for agent/automation access)
- [ ] `src/middleware.ts` — auth check on all routes except `/api/auth/*` and public assets
- [ ] `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- [ ] Optional Google Sign-In with admin approval workflow

### 10.2 RBAC

- [ ] Roles: viewer (read-only), operator (read/write tasks/agents/chat), admin (full access)
- [ ] `withRole("admin")` wrapper for protected endpoints
- [ ] UI: show/hide action buttons based on role

### 10.3 Audit Trail

- [ ] Log all CUD operations, login/logout, permission changes to `audit_events`
- [ ] `GET /api/audit?user={id}&action={type}&since={date}`
- [ ] Audit log viewer in admin settings

### 10.4 Settings Page (`/settings`)

- [ ] Gateway config: OpenClaw URL, port, connection test
- [ ] Auth settings: default role, session duration
- [ ] Notification preferences
- [ ] Theme: dark/light toggle (persist per user)
- [ ] API key management: generate/revoke
- [ ] Database info: size, migration status

### 10.5 Multi-Gateway

- [ ] `GET/POST/DELETE /api/gateways`, `POST /api/gateways/{id}/check`
- [ ] Gateway list with status indicators
- [ ] Route agent spawns to gateways based on load/affinity

### 10.6 Device Identity

- [ ] Generate Ed25519 keypair on first run, store in `.data/device-identity.json`
- [ ] Use for gateway handshake and webhook signing
- [ ] `GET /api/device/identity` (public key only)

**Sprint 10 Deliverables:** RBAC auth, audit trail, settings page, multi-gateway, device identity.

---

## Sprint 11 — Chat Override + Mock Cleanup + Polish

**Goal:** Wire chat to DB, delete all mock data, add data export, standup reports.

### 11.1 Chat Backend (Override)

Replace `src/app/api/chat/send/route.ts` (currently in-memory Map):

- [ ] Wire to existing `chat_messages` table in Drizzle schema
- [ ] DB persistence for all messages
- [ ] Delivery tracking: sent -> delivered -> read
- [ ] @mentions with agent autocomplete
- [ ] SSE push for new messages

### 11.2 Delete All Mock Data

Remove every `mock-*.ts` file and update all consumers:

| File | Consumers to Update |
|------|-------------------|
| `src/lib/mock-activities.ts` | Activity page — use DB |
| `src/lib/mock-alerts.ts` | Alerts page — use alert_rules engine |
| `src/lib/mock-brief.ts` | Brief page — use DB or empty state |
| `src/lib/mock-calendar.ts` | Calendar page — use DB or empty state |
| `src/lib/mock-certifications.ts` | Certifications page — use DB |
| `src/lib/mock-chat.ts` | Agent API fallback, chat — use DB |
| `src/lib/mock-data.ts` | Various — use DB |
| `src/lib/mock-docs.ts` | Docs page — use DB |
| `src/lib/mock-pipeline.ts` | Pipeline page — use DB |
| `src/lib/mock-workstreams.ts` | Skyward page — use DB |

- [ ] For each: update consumer to query DB, add empty-state UI component
- [ ] Delete mock files
- [ ] Delete old polling hooks: `usePolling.ts`, `useTasks.ts`, `useAgents.ts`, `useActivities.ts`, `useSSE.ts`
- [ ] Delete `src/lib/mission-control/mcStore.ts`

### 11.3 Data Export

- [ ] `GET /api/export/tasks?format=csv` and `format=json`
- [ ] `GET /api/export/agents?format=csv` and `format=json`
- [ ] `GET /api/export/tokens?format=csv` and `format=json`
- [ ] Export button on relevant pages

### 11.4 Standup Report Generation

- [ ] `GET /api/standup?date=YYYY-MM-DD` — auto-generated report from activities, tasks completed, tasks started, blockers
- [ ] `/standup` page with daily report view
- [ ] Configurable via cron to auto-generate at 9am

**Sprint 11 Deliverables:** DB-backed chat, zero mock files, data export, standup reports.

---

## Sprint 12 — Testing & Hardening

**Goal:** Comprehensive test coverage, performance validation, documentation.

### 12.1 Unit Tests (Vitest)

- [ ] All new API endpoints (aim for 80%+ coverage on `/api/*`)
- [ ] Zustand stores (state transitions, SSE event handling)
- [ ] Zod validation schemas
- [ ] Event bus dispatch/subscribe
- [ ] Pipeline executor step logic

### 12.2 E2E Tests (Playwright)

- [ ] Spawn agent -> assign task -> move through Kanban -> review gate -> approve -> done
- [ ] Create webhook -> trigger event -> verify delivery
- [ ] Login -> role-restricted actions -> audit log entries
- [ ] Token usage recording -> budget alert firing
- [ ] Cron job creation -> manual trigger -> verify execution

### 12.3 Smoke Tests

- [ ] Expand `scripts/smoke-test-mc-api.sh` to cover all ~40 new endpoints
- [ ] CI-friendly: exit codes, timeout handling

### 12.4 Performance

- [ ] SSE: verify 50+ concurrent connections
- [ ] Kanban: smooth DnD with 200+ tasks
- [ ] Logs viewer: handle 10k+ entries with virtual scrolling
- [ ] DB queries: add indexes for common filters (agent_id, status, created_at)

### 12.5 Documentation

- [ ] Update README with new features and setup instructions
- [ ] API reference (OpenAPI spec — nice-to-have)
- [ ] Environment variables reference

**Sprint 12 Deliverables:** Test suite, performance validation, updated docs.

---

## Dependency Graph

```
Sprint 0 (Foundation)
  |
  +---> Sprint 1 (Nav + Layout)
  |       |
  |       +---> Sprint 2 (Overview)
  |       |
  |       +---> Sprint 3 (Agents) ----+
  |       |                           |
  |       +---> Sprint 4 (Tasks) -----+---> Sprint 5 (Monitoring)
  |                                   |       |
  |                                   |       +---> Sprint 6 (Tokens)
  |                                   |
  |                                   +---> Sprint 7 (Automation)
  |                                   |       |
  |                                   |       +---> Sprint 8 (Webhooks/Alerts)
  |                                   |
  |                                   +---> Sprint 9 (Memory)
  |                                   |
  |                                   +---> Sprint 10 (Auth/Settings)
  |
  +---> Sprint 11 (Chat/Cleanup) — after Sprints 3-10 complete
          |
          +---> Sprint 12 (Testing) — final
```

**Critical path:** Sprint 0 -> 1 -> 3/4 (parallel) -> 5 -> 11 -> 12

---

## Metrics & Exit Criteria

| Metric | Target |
|--------|--------|
| New API endpoints | ~40 |
| New DB tables | 15 |
| New pages | 12 (overview, agents, sessions, logs, tokens, cron, orchestration, webhooks, alerts, memory, settings, standup) |
| Zustand stores | 8 |
| Mock files deleted | 10 |
| Test coverage (API) | 80%+ |
| SSE concurrent connections | 50+ |
| Zero mock fallbacks | All pages use real DB data |

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| DB migration breaks existing data | Run migration on copy first; add `IF NOT EXISTS` guards |
| SSE memory leak with many connections | Connection pooling, heartbeat timeout, max connections limit |
| DnD library conflicts with React 19 | `@hello-pangea/dnd` has React 19 support; test early in Sprint 0 |
| Auth breaks existing agent API calls | Phase in auth gradually; `x-api-key` header for backward compat |
| Pipeline executor hangs on failed steps | Timeout per step, dead-letter queue for failed runs |
| Mock removal breaks pages before DB is seeded | Sprint 11 runs after all DB-backed features are live; add empty states first |
