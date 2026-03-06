# Running Mission Control as a Separate App

Use [Mission Control](https://github.com/builderz-labs/mission-control) alongside Claw-Command for agent orchestration (Kanban, cost tracking, real-time monitoring).

## Mission Control–Style Features in Claw-Command

Claw-Command now includes several Mission Control–inspired features:

| Feature | Description |
|---------|-------------|
| **Review column** | Kanban has a "Review" stage (work complete, awaiting approval) |
| **Task comments** | Threaded comments on tasks (in task edit modal) |
| **Tokens page** | Placeholder for token/cost tracking (coming soon) |
| **MC APIs** | Task queue, heartbeat, spawn under `/api/mc/` |

## Architecture

```
┌─────────────────┐     push tasks      ┌──────────────┐
│  Claw-Command   │ ──────────────────► │   OpenClaw   │
│  (domain UI)     │                    │   Gateway    │
│  certifications │                    │   agents     │
│  pipeline       │                    │   sessions   │
│  brief, etc.    │                    └──────┬───────┘
└─────────────────┘                           │
                                               │ WebSocket + RPC
                                               ▼
                                        ┌──────────────┐
                                        │   Mission    │
                                        │   Control    │
                                        │   (agent UI) │
                                        │   Kanban     │
                                        │   costs      │
                                        │   logs       │
                                        └──────────────┘
```

- **Claw-Command** — Domain dashboard (certifications, pipeline, brief). Pushes tasks to OpenClaw.
- **OpenClaw** — Agent runtime. Runs agents, manages sessions.
- **Mission Control** — Agent orchestration dashboard. Connects to OpenClaw for real-time view.

## Prerequisites

- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm` or `corepack enable`)
- OpenClaw gateway running (same one Claw-Command uses)
- Port 3000 free for Mission Control (or use a different port)

## Quick Setup

### 1. Clone and install Mission Control

```bash
git clone https://github.com/builderz-labs/mission-control.git
cd mission-control
pnpm install
cp .env.example .env
```

### 2. Configure `.env`

Edit `mission-control/.env`:

```env
# Auth (change these!)
AUTH_USER=admin
AUTH_PASS=your-secure-password
API_KEY=generate-a-random-key

# OpenClaw — same gateway Claw-Command uses
OPENCLAW_GATEWAY_HOST=127.0.0.1
OPENCLAW_GATEWAY_PORT=18789

# If OpenClaw runs elsewhere, use your host
# OPENCLAW_GATEWAY_HOST=your-openclaw-host
# OPENCLAW_GATEWAY_PORT=18789

# Path to OpenClaw config (for memory, logs, agent sync)
OPENCLAW_HOME=~/.openclaw
# Or: OPENCLAW_CONFIG_PATH=/path/to/openclaw.json

# Frontend gateway URL (for browser WebSocket)
NEXT_PUBLIC_GATEWAY_HOST=127.0.0.1
NEXT_PUBLIC_GATEWAY_PORT=18789
```

### 3. Run Mission Control

```bash
pnpm dev
```

Open **http://localhost:3000** and log in with `AUTH_USER` / `AUTH_PASS`.

## What You'll See in Mission Control

| Panel | Description |
|-------|-------------|
| **Task Board** | Kanban (inbox → backlog → todo → in-progress → review → done) |
| **Agents** | Agent status, heartbeats, spawn sessions |
| **Activities** | Live activity feed |
| **Tokens** | Token usage and cost tracking |
| **Sessions** | Active OpenClaw sessions |
| **Logs** | Agent log browser |
| **Memory** | Agent memory files (if `OPENCLAW_MEMORY_DIR` set) |

## How It Works With Claw-Command

1. **Tasks** — When you create a task in Claw-Command and assign it to an agent, Claw-Command pushes it to OpenClaw via `sessions_spawn`. Mission Control shows that session/task via its OpenClaw connection.

2. **Agents** — Both apps see the same agents. Mission Control gets agent status from OpenClaw; Claw-Command gets it from its sync or OpenClaw.

3. **Claw-Command APIs** — Mission Control can optionally use Claw-Command's `/api/mc/*` endpoints (task queue, heartbeat, spawn) if you configure agents to poll Claw-Command. By default, Mission Control talks to OpenClaw directly.

## Ports

| App | Default Port |
|-----|--------------|
| Claw-Command | 3000 |
| Mission Control | 3000 |
| OpenClaw Gateway | 18789 |

Run Mission Control on a different port to avoid conflict:

```bash
PORT=3001 pnpm dev
```

Then open http://localhost:3001.

## Production

- Deploy Mission Control separately (Vercel, Docker, etc.)
- Set `OPENCLAW_GATEWAY_HOST` to your OpenClaw gateway host
- Configure `MC_ALLOWED_HOSTS` for network access
- Use TLS (reverse proxy) for any public deployment
