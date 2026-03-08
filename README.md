# Claw Command

Business operations dashboard and agent orchestration platform for Vorentoe LLC. Built with Next.js 16, React 19, Tailwind CSS, Drizzle ORM (Postgres), and Zustand.

## Features

- **Certifications** -- Track government certifications (8(a), MBE, etc.) with document management
- **Pipeline** -- Business development pipeline with stages (identify/qualify/capture/propose/win)
- **Tasks** -- Kanban task board with agent assignment and review gates
- **Agents** -- OpenClaw agent status, heartbeat monitoring, and spawn management
- **Brief** -- Daily operations brief
- **Docs** -- Document management for certifications and proposals
- **Calendar** -- Business calendar with conflict detection
- **Email** -- Gmail OAuth integration with AI-driven rules
- **Skyward** -- Program-specific workstream tracking

## Agent Integration

Claw Command integrates with [OpenClaw](https://github.com/builderz-labs) for agent orchestration and exposes Mission Control-compatible APIs. See [docs/MISSION_CONTROL.md](docs/MISSION_CONTROL.md) for API details.

Agents can pull live context (certifications, tasks, alerts) via the Agent Context API. See [docs/AGENT_CONTEXT.md](docs/AGENT_CONTEXT.md).

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (recommended: [Neon](https://neon.tech))

### Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and other settings
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` or `POSTGRES_URL` | Yes | Postgres connection string |
| `OPENCLAW_URL` | No | OpenClaw gateway URL (default: localhost:18789) |
| `MC_API_KEY` | No | API key for MC-compatible endpoints |
| `NEXT_PUBLIC_APP_URL` | No | Base URL for agent context URLs |
| `OPENCLAW_METRICS_URL` | No | Prometheus metrics URL for token tracking |

### Database

```bash
npm run db:push    # Push schema to database
```

## Documentation

| Doc | Description |
|-----|-------------|
| [BUILD_PLAN.md](docs/BUILD_PLAN.md) | Sprint-organized build plan for Mission Control integration |
| [MISSION_CONTROL.md](docs/MISSION_CONTROL.md) | MC-compatible API reference and MC shell endpoints |
| [AGENT_CONTEXT.md](docs/AGENT_CONTEXT.md) | Agent Context API for injecting live data into agent prompts |
| [MISSION_CONTROL_SETUP.md](docs/MISSION_CONTROL_SETUP.md) | Running Mission Control as a separate app (transitional) |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and fixes |

## Architecture

```
Claw Command (Next.js)  ---push tasks--->  OpenClaw Gateway
  - Domain UI                                - Agent runtime
  - MC-compatible APIs                       - Sessions
  - Agent Context API                        - Agent orchestration
  - Drizzle ORM / Postgres
```

## Tech Stack

- **Framework:** Next.js 16 / React 19
- **Styling:** Tailwind CSS
- **Database:** Drizzle ORM + PostgreSQL (Neon)
- **State:** Zustand
- **Validation:** Zod
- **DnD:** @hello-pangea/dnd
- **Logging:** Pino
