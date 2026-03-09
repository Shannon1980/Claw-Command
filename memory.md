# Claw Command — Project Memory

## Identity

Claw Command is a business operations dashboard and agent orchestration platform for **Vorentoe LLC**. It serves as a unified command center for managing government certifications, business development pipeline, agent coordination, task workflows, and operational intelligence with AI-driven automation. Mission Control-compatible.

**Version:** 0.1.0 (active development)

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Language:** TypeScript 5.9 (strict mode)
- **Styling:** Tailwind CSS 4
- **State:** Zustand 5 with `subscribeWithSelector` middleware (9 stores)
- **Database:** PostgreSQL via Drizzle ORM 0.45 — 35+ tables
- **Logging:** Pino 10
- **Deployment:** Vercel (with cron jobs)
- **Node:** 20+

## Key Dependencies

- `@hello-pangea/dnd` — drag-and-drop (kanban boards)
- `googleapis` — Gmail OAuth, Google Calendar
- `openai` — AI features
- `recharts` / `@xyflow/react` — data visualization
- `drizzle-orm` + `drizzle-kit` — DB schema & migrations

## Project Structure

```
src/
  app/              # Next.js App Router pages + 132 API route handlers
    api/
      mc/           # Mission Control compatible endpoints
      mission-control/
      tasks/        # Task queue, assignment
      agents/       # Agent heartbeat, status
      auth/         # Login, session management
      email/        # Gmail OAuth, email worker
      opportunity-engine/
      cron/         # Scheduled jobs
      sync/         # Data sync from OpenClaw
  lib/              # Shared business logic (~50 modules)
    db/             # Schema, client, seed data
    stores/         # 9 Zustand stores
    auth/           # Session validation, auth guards
    mission-control/
    openclaw/       # OpenClaw gateway communication
    opportunity-engine/
    email/          # Gmail integration, AI rules
    tasks/          # Task business logic
    pipelines/      # Pipeline orchestration
    hooks/          # Custom React hooks
    utils/          # Utilities
  components/       # React components by domain
    layout/         # Navigation, TopBar, Providers, LiveFeed
    tasks/          # Task board, kanban
    pipeline/       # Pipeline visualization
    agents/         # Agent management
    shared/         # Reusable components
  types/            # TypeScript type definitions
drizzle/            # Database migrations
memory/             # Seed memories (markdown)
scripts/            # Build & deployment scripts
docs/               # Documentation (BUILD_PLAN, MISSION_CONTROL, TASKS, etc.)
```

## Development Commands

```bash
npm run dev          # Dev server on localhost:3000
npm run build        # Production build
npm start            # Start production server
npm run lint         # ESLint
npm run db:push      # Push schema to database
npm run db:check     # Verify database connection
npm run test:mc-api  # Smoke test Mission Control APIs
```

## Conventions

### Naming
- **Variables/functions:** camelCase
- **Types/interfaces/components:** PascalCase
- **DB tables:** snake_case
- **API paths:** kebab-case

### State Management
- Zustand stores with `subscribeWithSelector` middleware
- Pattern: `export const useXStore = create<Type>()((set, get) => ({ ... }))`
- Stores: taskStore, agentStore, tokenStore, notificationStore, overviewStore, chatStore, sessionStore, logStore, pipelineStore

### API Routes
- Next.js Route Handlers (App Router)
- Mission Control-compatible paths under `/api/mc/`
- Auth via `MC_API_KEY` header or session cookie

### Components
- `"use client"` directives for client-side components
- Providers pattern in `components/layout/Providers.tsx`
- Modular folders by domain

### Data Patterns
- JSON fields in Postgres for flexible structured data
- ISO 8601 timestamp strings (not DB timestamps)
- Immutable event log via `activities` table
- Soft deletes via `dismissedAt`, `retiredAt` fields

### Auth
- Basic auth: username/password hash + session tokens
- OAuth: Google (Gmail)
- API key: `MC_API_KEY` for Mission Control
- Roles: `viewer` | `operator` | `admin`

## Database

Schema at `src/lib/db/schema.ts`. Core domains:

- **agents** — registry, status, soul definitions
- **opportunities** — BD pipeline (identify → qualify → capture → propose → win/lost)
- **tasks** — kanban board (inbox/backlog/in_progress/review/quality_review/blocked/done)
- **applications** — app portfolio tracking
- **activities** — immutable event log
- **certifications** — government certs (8(a), MBE, etc.)
- **email** — Gmail OAuth accounts, AI-driven rules
- **pipelines / pipeline_runs** — orchestration
- **users / sessions** — auth with roles
- **mc_** tables — Mission Control specific data

Connection pool: `src/lib/db/client.ts`

## External Integrations

- **OpenClaw** — agent orchestration gateway
- **Gmail** — OAuth-based email processing with AI rules
- **Google Calendar** — event sync
- **OpenAI** — AI-powered features
- **SAM.gov** — government contracting opportunities
- **News APIs** — GNews, The Guardian, NewsAPI

## Vercel Cron Jobs

| Schedule      | Endpoint                         | Purpose              |
|---------------|----------------------------------|----------------------|
| `*/1 * * * *` | `/api/cron/scheduler`            | Task scheduler       |
| `0 9 * * *`   | `/api/email/worker/run`          | Daily email worker   |
| `*/5 * * * *` | `/api/heartbeat-all`             | Agent heartbeat sync |
| `0 6 * * *`   | `/api/opportunity-engine/scan`   | Opportunity scanning |

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/db/schema.ts` | Complete database schema |
| `src/lib/db/client.ts` | Database connection pool |
| `src/app/page.tsx` | Main dashboard |
| `package.json` | Dependencies & scripts |
| `drizzle.config.ts` | Drizzle ORM setup |
| `next.config.ts` | Next.js optimization (tree-shaking) |
| `vercel.json` | Cron job schedules |
| `tsconfig.json` | TypeScript config (strict, path aliases) |

## Documentation

- `docs/BUILD_PLAN.md` — sprint-organized development roadmap
- `docs/MISSION_CONTROL.md` — MC API integration guide
- `docs/AGENT_CONTEXT.md` — agent context injection API
- `docs/MEMORY_PAGES.md` — memory system documentation
- `docs/TASKS.md` — task system reference
- `docs/TROUBLESHOOTING.md` — common issues & fixes

## Build Optimization

- Server-only packages excluded from client bundle: `pg`, `pino`, `googleapis`, `docx`
- Package import optimization for `recharts`, `@xyflow/react`, `@hello-pangea/dnd`, `zustand`
- Graceful degradation: app works offline without OpenClaw
