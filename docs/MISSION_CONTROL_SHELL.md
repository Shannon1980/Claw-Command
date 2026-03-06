# Mission Control Shell (Milestone A)

MC shell inside Claw-Command with Kanban, Schedule, Memory Recall, and Dependencies.

## Persistence (Milestone B)

When `DATABASE_URL` or `POSTGRES_URL` is set, MC data persists to Postgres via Drizzle. Run the migration to create MC tables:

```sql
-- Add to scripts/run-migrations-in-neon.sql (section 10) or run db:push
```

Or use `npm run db:push` after adding the MC schema. Without DB, MC uses in-memory store (resets on restart).

## Navigation

- **MC tab** in main nav → `/mission-control`
- Landing shows MissionHeader + grid (Kanban, Schedule, Memory Recall, Dependencies)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mission-control/opportunities` | GET, POST | Opportunities |
| `/api/mission-control/teaching-tasks` | GET, POST | Teaching tasks |
| `/api/mission-control/blockers` | GET, POST | Blockers/dependencies |
| `/api/mission-control/blockers/:id` | PATCH | Update blocker (e.g. `status: "resolved"`) |
| `/api/mission-control/agents` | GET | Agents |
| `/api/mission-control/schedule` | GET, POST | Schedule blocks |
| `/api/mission-control/memory` | GET | Memories (seeded from MEMORY.md) |
| `/api/mission-control/memory/remember` | POST | Add memory item |
| `/api/mission-control/recall?q=` | GET | Recall by query |
| `/api/mission-control/seed` | POST | Seed all domains (memory + default data when DB empty) |

## Seed

- **Memory:** `MEMORY.md` and `memory/*.md` at project root. First `GET /memory` auto-seeds if empty.
- **All domains:** `POST /api/mission-control/seed` seeds memory from files and, when DB is available and empty, inserts default opportunities, teaching tasks, blockers, and schedule.

## Extension Bridge

`dispatchMCAction()` from `@/lib/mission-control/extensionBridge`:

- `recall(query)` | `remember(content, source?)`
- `createOpportunity(title, stage?)` | `createTeachingTask(title, status?)` | `createBlocker(title, blockerType?)`

## Demo

See **[DEMO_MILESTONE_A.md](DEMO_MILESTONE_A.md)** for the full walkthrough.

**Quick:** `./scripts/demo-milestone-a.sh` (with dev server running)
