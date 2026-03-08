# Tasks Page & Functionality

The Tasks system is a **Kanban-based task management board** that allows Shannon (the user) to create, assign, track, and approve tasks performed by AI agents. It is a core operational feature of the Claw-Command platform.

---

## Architecture Summary

### Key Files

| Layer | File(s) |
|-------|---------|
| Page | `src/app/tasks/page.tsx` |
| Components | `src/components/tasks/TaskKanban.tsx`, `TaskCard.tsx`, `TaskEditModal.tsx` |
| State Store | `src/lib/stores/taskStore.ts` |
| Hook | `src/lib/hooks/useTasks.ts` |
| API Routes | `src/app/api/tasks/` (main CRUD + sub-routes) |
| DB Schema | `src/lib/db/schema.ts` (tasks table, task_comments table) |
| Sync | `src/lib/tasks/sync.ts` (OpenClaw session sync) |
| Events | `src/lib/events/eventBus.ts`, `emitActivity.ts` |

---

## Data Model

### Task Fields

- **Core:** `id`, `title`, `description`
- **Assignment:** `assigned_to_agent_id` (FK to agents; NULL = assigned to Shannon), `depends_on_shannon` (boolean for approval gates)
- **Status:** `inbox | backlog | in_progress | review | quality_review | blocked | done`
- **Priority:** `high | medium | low`
- **Metadata:** `due_date`, `outcome`, `project`, `ticket_ref`
- **Relationships:** `parent_opportunity_id`, `parent_application_id`
- **Timestamps:** `created_at`, `updated_at`
- **Joined fields:** `agent_name`, `agent_emoji`, `agent_domain`, `comment_count`, `linked_doc_count`

### Task Comments

- `id`, `task_id`, `author`, `content`, `parent_comment_id`, `created_at`

---

## UI Components

### Tasks Page (`src/app/tasks/page.tsx`)

Client-side React component that serves as the entry point. On mount it fetches tasks and agents via Zustand stores, then renders the `TaskKanban` component. The header includes a title, brief instructions, and a refresh button.

### Kanban Board (`src/components/tasks/TaskKanban.tsx`)

The main interactive surface with these features:

- **7 status columns:** Inbox, Backlog, In Progress, Review, Quality Review, Blocked, Done
- **Drag-and-drop** between columns via `@hello-pangea/dnd`
- **"Add Task" button** for inline task creation
- **"Bulk" mode** for selecting and batch-moving multiple tasks
- Tasks are **sorted by priority** within each column (high > medium > low)
- Each column shows a **task count badge**

### Task Card (`src/components/tasks/TaskCard.tsx`)

Each card displays:

- Title and description
- Agent assignment (emoji + name; defaults to "Shannon" when unassigned)
- Priority badge (high = red, low = green, medium = hidden)
- Due date, project tag, ticket reference
- Visual indicators for: "Needs approval", linked documents, review status
- Status-specific tags ("Review deliverable", "No deliverable")

Clicking a card opens the edit modal.

### Task Edit Modal (`src/components/tasks/TaskEditModal.tsx`)

A comprehensive editing modal with three tabs:

1. **Details** — Title, description, status, priority, agent assignment, due date, project, ticket reference, outcome/deliverable field, "Needs my approval" checkbox. Action buttons: Request Review, Approve, Reject.
2. **Documents** — Link existing documents as deliverables, view linked documents with review status, preview document content inline, create new document associations.
3. **Comments** — Chronological comment thread with add-new-comment input (supports Enter key submission).

---

## State Management

### Zustand Store (`src/lib/stores/taskStore.ts`)

Central client-side state for tasks:

| State | Description |
|-------|-------------|
| `tasks[]` | Full task list |
| `filters` | Active filter criteria |
| `loading` | Loading indicator |
| `error` | Error message |

| Action | Description |
|--------|-------------|
| `fetchTasks()` | GET `/api/tasks?all=true` |
| `moveTask(taskId, newStatus)` | PATCH `/api/tasks/{id}` with optimistic update + rollback on failure |
| `updateTask()` | Update a task in local state |
| `addTask()` | Add a task to local state |
| `removeTask()` | Remove a task from local state |
| `setFilters()` | Filter by status, agent, project, priority, search text |
| `handleSSEEvent()` | Process real-time server-sent events |
| `filteredTasks()` | Computed list applying current filters |

### Hook (`src/lib/hooks/useTasks.ts`)

A convenience hook wrapping the store with:

- **Polling** at 15-second intervals for fresh data
- `depends_on_shannon` filter parameter support
- Returns: `tasks`, `loading`, `error`, `refresh`

---

## API Endpoints

### Core CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks with filters (`status`, `agent`, `project`, `priority`, `search`, `all`, `depends_on_shannon`) |
| POST | `/api/tasks` | Create task (requires `title`; optional: description, status, priority, agent, due_date, project, ticket_ref) |
| GET | `/api/tasks/[id]` | Get single task with comment count and linked doc count |
| PATCH | `/api/tasks/[id]` | Update any task fields |
| DELETE | `/api/tasks/[id]` | Delete a task |

### Task Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks/[id]/approve` | Approve task; sets status to `done`, emits activity notification |
| POST | `/api/tasks/[id]/reject` | Reject task; sets status to `blocked`, accepts optional reason |
| POST | `/api/tasks/[id]/request-review` | Move to `review` status; optionally attach a document |
| POST | `/api/tasks/[id]/assign-document` | Link a document as a task deliverable |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/[id]/comments` | Get threaded comments for a task |
| POST | `/api/tasks/[id]/comments` | Add a comment (supports reply threading via `parent_comment_id`) |

### Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks/sync` | Sync OpenClaw agent sessions into the tasks table |
| GET | `/api/mc/tasks/queue` | Mission Control endpoint; agents poll for their next assigned task |

---

## Key Patterns

### Optimistic Updates
The UI updates immediately when a task is dragged to a new column. If the API call fails, the change is rolled back and an error is displayed.

### Approval Gates
When `depends_on_shannon` is `true`, the task requires Shannon's explicit approval before it can be marked as done. The approve/reject actions are available in the task edit modal.

### Agent Assignment
Tasks can be assigned to any registered AI agent. A `NULL` `assigned_to_agent_id` means the task belongs to Shannon directly. Agent info (name, emoji, domain) is joined on retrieval.

### Document Linking
Tasks can reference one or more documents as deliverables. Linked documents track review status, and their content can be previewed inline from the Documents tab.

### Real-time Sync
The event bus (`src/lib/events/eventBus.ts`) emits `task_update` events that flow to the SSE feed, enabling live UI updates without full page refreshes.

### Activity Logging
All task mutations (create, update, approve, reject, comment, document assignment) are logged to the `activities` table, providing an immutable audit trail.

### OpenClaw Integration
Tasks can be pushed to AI agents via the OpenClaw gateway for execution. Conversely, OpenClaw agent sessions are synced back as task records (prefixed with `oc-`) through the `/api/tasks/sync` endpoint.

---

## Navigation

Tasks appears in the main **COMMAND** section of the sidebar navigation (`src/components/layout/Navigation.tsx`) with a checklist icon, alongside Overview, Daily Brief, Agents, Chat, Email, Docs, and Ops Brief.
