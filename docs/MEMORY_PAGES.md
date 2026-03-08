# Memory Pages — How It Works

The Memory system is a persistent knowledge base that stores facts, procedures, preferences, and context that agents can recall during tasks and chats. It is accessible at the `/memory` route in the dashboard.

## Architecture

### Database (`mc_memories` table)

The backend auto-creates a Postgres table with these columns:

| Column       | Type | Description                                          |
|--------------|------|------------------------------------------------------|
| `id`         | TEXT | Auto-generated (`mem-<timestamp>`)                   |
| `content`    | TEXT | The actual knowledge text                            |
| `source`     | TEXT | Where the memory came from (agent name, "user", etc) |
| `category`   | TEXT | One of: `fact`, `procedure`, `preference`, `context` |
| `tags`       | TEXT | JSON array or comma-separated string                 |
| `created_at` | TEXT | Creation timestamp                                   |
| `updated_at` | TEXT | Last update timestamp                                |

Schema is auto-created on first API call via `ensureSchema()` in `src/app/api/memory/route.ts`.

### REST API

| Endpoint              | Methods          | Purpose                                      |
|-----------------------|------------------|----------------------------------------------|
| `/api/memory`         | GET, POST        | List/filter memories, create new ones         |
| `/api/memory/[id]`    | GET, PATCH, DELETE | Read, update, or delete a specific memory   |
| `/api/memory/recall`  | GET              | Relevance-ranked search (`?q=` parameter)     |

**Filtering** on the list endpoint supports: `search` (content ILIKE), `category`, `tag`/`tags`, and `limit`.

**Recall** ranks results by position of the query match in the content (earlier match = more relevant), returning up to 20 results.

### UI Page (`/memory`)

The React page (`src/app/memory/page.tsx`) provides:

- **Search bar** — filters memories by content (ILIKE on the server, plus client-side filtering)
- **Category filter tabs** — all / fact / procedure / preference / context
- **Tag filter buttons** — dynamically generated from existing tags in the result set
- **Card grid** — 2-column responsive layout with expand/collapse for long content
- **Add/Edit forms** — inline forms for creating and editing memories
- **Delete with confirmation** — two-step delete flow

### Seed Files (`memory/*.md`)

The `memory/` directory contains markdown seed files that serve as bootstrap knowledge:

- `seed-tasks.md` — teaching tasks
- `seed-blockers.md` — known blockers
- `seed-opportunities.md` — active opportunities

These are auto-seeded into the database on first `GET /api/mission-control/memory` call if the database is empty.

## Integration Points

### Chat Commands

In the chat interface (`src/components/chat/ChatWindow.tsx`), agents interact with memory via:

- **`/recall <query>`** — searches memories and displays results inline in chat
- **`/remember <content>`** — saves chat content as a memory with `source="chat"`

### Mission Control API

A Mission Control-compatible layer provides additional endpoints:

- `GET /api/mission-control/memory` — returns memories (auto-seeds from `memory/*.md` on first call)
- `POST /api/mission-control/memory/remember` — store a new memory
- `GET /api/mission-control/recall?q=` — search with relevance scoring

### Command Palette

The command palette includes:
- "Go to Memory" — navigation to `/memory`
- "Add Memory" — quick action to open the add form

### Overview Dashboard

A "Memory" quick action card on the main dashboard links to `/memory`.

## Data Flow

```
User/Agent ──► /api/memory (CRUD) ──► mc_memories table (Postgres)
                                          ▲
Chat ─────► /recall, /remember ───────────┘
                                          ▲
Mission Control ► /api/mission-control/memory ┘
                                          ▲
Seed files ──► memory/*.md ───────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/memory/page.tsx` | Memory page UI |
| `src/app/api/memory/route.ts` | Main API (GET list, POST create) |
| `src/app/api/memory/[id]/route.ts` | Single memory API (GET, PATCH, DELETE) |
| `src/app/api/memory/recall/route.ts` | Recall/search API |
| `src/components/chat/ChatWindow.tsx` | Chat integration (/recall, /remember) |
| `memory/*.md` | Seed data files |
