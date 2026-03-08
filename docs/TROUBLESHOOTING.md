# Troubleshooting: Unable to Fetch Data

If the Overview, Agents, Tasks, or other pages show empty data or errors, check the following.

## 1. Database schema mismatch

The app expects columns and tables that may be missing if you ran an older migration.

**Fix:** Run the schema fix in Neon Console:

1. Go to [Neon Console](https://console.neon.tech) → Your Project → SQL Editor
2. Paste and run the contents of `scripts/fix-schema-mismatch.sql`

This adds:
- `agents`: soul, capabilities, api_key, retired_at, created_at
- `tasks`: description, outcome, project, ticket_ref; allows null assigned_to_agent_id
- `webhooks`, `users`, `notifications` tables
- `users`: username, password_hash for auth
- `sessions_auth` for login
- `mc_memories`: category, updated_at
- `token_usage`, `gateways`, `alert_rules`, `pipelines`, `pipeline_runs`, `cron_jobs`, `webhook_deliveries`, `agent_messages`, `audit_log` tables

## 2. Verify database connection

Run locally to confirm `DATABASE_URL` works:

```bash
npm run db:check
```

If you see `EAI_AGAIN` or DNS errors, the sandbox/CI environment may block outbound DB connections. Run this on your machine or in a deployment environment where the DB is reachable.

**Before deploy (schema ready):** Run these locally (where DB is reachable):

```bash
npm run db:check    # Verify connection
npm run db:push     # Push schema to Neon
curl -X POST http://localhost:3000/api/seed   # Or after deploy: POST https://your-app.vercel.app/api/seed
```

## 3. Environment variables

Ensure `.env.local` has:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` or `POSTGRES_URL` | Yes | Neon Postgres connection string |
| `OPENCLAW_URL` | No | OpenClaw gateway URL (default: localhost:18789). Needed for sync, gateway status. |
| `MC_API_KEY` | No | If set, API requests need `Authorization: Bearer <key>` or session cookie |

## 4. Auth blocking API calls

If `MC_API_KEY` is set (e.g. on Vercel), unauthenticated API requests return 401.

**Fix:** Either:
- Remove `MC_API_KEY` for local dev, or
- Log in via `/api/auth/login` so the session cookie is set, or
- Add `Authorization: Bearer <MC_API_KEY>` to API requests (for automation)

## 5. Empty database

If tables exist but are empty, agents and tasks will show as empty.

**Fix:** Seed data:
- `POST /api/seed` — seeds agents, tasks, opportunities, activities
- Or run `scripts/run-migrations-in-neon.sql` and then seed

## 6. OpenClaw gateway offline

Gateway status, sync, and some agent/task features require OpenClaw.

**Fix:** Start OpenClaw locally, or leave `OPENCLAW_URL` unset — the app will show "offline" but DB-backed data (agents, tasks) will still load.
