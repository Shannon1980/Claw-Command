# Milestone A Demo Script (10–15 min)

Step-by-step walkthrough for the Mission Control shell demo.

## Prerequisites

- `npm run dev` running
- Browser open to the app

---

## 1. MC Tab (2 min)

1. Click **Mission Control** in the nav
2. Navigate to `/mission-control`
3. **Show:** MissionHeader, Kanban board (5 lanes), Schedule panel, Memory Recall, Blockers/Dependencies

**Success:** All four panels render with seed data or placeholders.

---

## 2. Memory Seed (2 min)

1. Run: `curl -X POST http://localhost:3000/api/mission-control/seed`
2. Or trigger from any tool that can POST
3. **Show:** Response `{ "memoriesLoaded": N }`

**Success:** Memories from MEMORY.md and memory/*.md are loaded.

---

## 3. Recall API (2 min)

1. Run: `curl "http://localhost:3000/api/mission-control/recall?q=certification"`
2. **Show:** JSON with `results` array of matching memories

**Success:** Recall returns seeded items matching the query.

---

## 4. Chat Recall/Remember (4 min)

1. Go to **Chat** (`/chat`)
2. Select an agent
3. Type: `/recall certification` → Send
4. **Show:** Recall result appears below input
5. Type: `/remember Important decision from today` → Send
6. **Show:** "Remembered" confirmation

**Success:** Chat commands invoke extensionBridge; recall and remember work.

---

## 5. Smoke Tests (2 min)

```bash
./scripts/smoke-test-mc-api.sh
# or
npm run test:mc-api
```

**Success:** All MC API endpoints return 200.

---

## Quick Run

```bash
./scripts/demo-milestone-a.sh
```

Follow the prompts. Ensure the dev server is running first.
