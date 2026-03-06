# Milestone A Demo Script (10–15 min)

Walk-through for the Mission Control shell inside Claw-Command.

## Prerequisites

- Claw-Command running (`npm run dev`)
- `MEMORY.md` and `memory/*.md` at project root (seed data)

---

## 1. MC Tab and Landing (2 min)

1. Open Claw-Command in the browser.
2. Click **Mission Control** in the top navigation.
3. Confirm the MC landing page shows:
   - Mission Control header
   - Kanban Board (5 lanes: Backlog → Done)
   - Schedule panel
   - Memory Recall panel
   - Blockers & Dependencies panel

---

## 2. Kanban and Schedule with Seed Data (3 min)

1. On the MC page, confirm the Kanban shows teaching tasks in lanes:
   - "Complete certification application draft" in In Progress
   - "Review MBE documents with Shannon" in Ready
2. Confirm the Schedule panel shows at least one block (e.g. "Certification review").
3. Confirm Blockers shows "Awaiting Shannon approval on 8(a) scope".

---

## 3. Memory Recall (3 min)

1. In the Memory Recall panel, click **Recall** with an empty or "certification" query.
2. Confirm seed memories appear (from MEMORY.md / memory/*.md).
3. Optional: `POST /api/mission-control/seed` to re-seed, then refresh the MC page.

---

## 4. Chat Recall and Remember (4 min)

1. Go to **Chat** in the nav.
2. Select an agent.
3. Type: `/recall certification`
4. Press Enter. Confirm a recall result appears above the input (memories matching "certification").
5. Type: `/remember 8(a) scope approved by Shannon`
6. Press Enter. Confirm "Remembered" appears.
7. Go back to **Mission Control** → Memory Recall. Confirm the new memory appears in the list.

---

## 5. API Endpoints (2 min)

Quick curl checks (replace base URL if needed):

```bash
# Opportunities
curl http://localhost:3000/api/mission-control/opportunities

# Teaching tasks
curl http://localhost:3000/api/mission-control/teaching-tasks

# Memory
curl http://localhost:3000/api/mission-control/memory

# Recall
curl "http://localhost:3000/api/mission-control/recall?q=certification"

# Seed (trigger)
curl -X POST http://localhost:3000/api/mission-control/seed
```

---

## Success Criteria

- [ ] MC tab visible and navigable
- [ ] Kanban, Schedule, Memory Recall, Dependencies render with seed data
- [ ] `/recall` and `/remember` in chat work and show results
- [ ] MC API endpoints return JSON
- [ ] Memory seed from MEMORY.md visible in Memory Recall panel
