/**
 * In-memory MC store. Seeded from MEMORY.md / memory/*.md via memoryAdapter.
 * Simple CRUD for each domain.
 */

import type {
  Opportunity,
  TeachingTask,
  Blocker,
  Agent,
  ScheduleBlock,
  MemoryItem,
} from "./mc_types";

export type MCSeedData = {
  opportunities: Opportunity[];
  teachingTasks: TeachingTask[];
  blockers: Blocker[];
  agents: Agent[];
  schedule: ScheduleBlock[];
  memories: MemoryItem[];
};

const now = () => new Date().toISOString();

// Default seed (will be overwritten by memoryAdapter.seedFromMemory for memories)
export const defaultMCSeed: MCSeedData = {
  opportunities: [
    {
      id: "opp-1",
      title: "8(a) certification application",
      stage: "in_progress",
      valueUsd: 0,
      probability: 70,
      ownerAgentId: "veronica",
      notes: "In progress",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "opp-2",
      title: "MBE certification documents",
      stage: "review",
      valueUsd: 0,
      probability: 80,
      ownerAgentId: "veronica",
      notes: "Under review",
      createdAt: now(),
      updatedAt: now(),
    },
  ],
  teachingTasks: [
    {
      id: "task-1",
      title: "Complete certification application draft",
      status: "in_progress",
      priority: "high",
      assignedToAgentId: "veronica",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "task-2",
      title: "Review MBE documents with Shannon",
      status: "ready",
      priority: "medium",
      assignedToAgentId: "veronica",
      createdAt: now(),
      updatedAt: now(),
    },
  ],
  blockers: [
    {
      id: "block-1",
      title: "Awaiting Shannon approval on 8(a) scope",
      type: "dependency",
      status: "open",
      createdAt: now(),
      updatedAt: now(),
    },
  ],
  agents: [
    { id: "veronica", name: "Veronica", emoji: "🦞", status: "idle", domain: "certifications" },
    { id: "bertha", name: "Bertha", emoji: "🦀", status: "idle", domain: "pipeline" },
  ],
  schedule: [
    {
      id: "sched-1",
      title: "Certification review",
      start: new Date().toISOString().slice(0, 10) + "T09:00:00",
      end: new Date().toISOString().slice(0, 10) + "T10:00:00",
      agentId: "veronica",
      type: "task",
    },
  ],
  memories: [],
};

// Mutable store
let store: MCSeedData = JSON.parse(JSON.stringify(defaultMCSeed));

export function getMCStore(): MCSeedData {
  return store;
}

export function setMCSeed(seed: Partial<MCSeedData>): void {
  store = {
    opportunities: seed.opportunities ?? store.opportunities,
    teachingTasks: seed.teachingTasks ?? store.teachingTasks,
    blockers: seed.blockers ?? store.blockers,
    agents: seed.agents ?? store.agents,
    schedule: seed.schedule ?? store.schedule,
    memories: seed.memories ?? store.memories,
  };
}

export function addOpportunity(opp: Omit<Opportunity, "id" | "createdAt" | "updatedAt">): Opportunity {
  const id = `opp-${Date.now()}`;
  const item: Opportunity = { ...opp, id, createdAt: now(), updatedAt: now() };
  store.opportunities.push(item);
  return item;
}

export function addTeachingTask(task: Omit<TeachingTask, "id" | "createdAt" | "updatedAt">): TeachingTask {
  const id = `task-${Date.now()}`;
  const item: TeachingTask = { ...task, id, createdAt: now(), updatedAt: now() };
  store.teachingTasks.push(item);
  return item;
}

export function addBlocker(blocker: Omit<Blocker, "id" | "createdAt" | "updatedAt">): Blocker {
  const id = `block-${Date.now()}`;
  const item: Blocker = { ...blocker, id, createdAt: now(), updatedAt: now() };
  store.blockers.push(item);
  return item;
}

export function updateBlocker(
  id: string,
  patch: Partial<Pick<Blocker, "title" | "type" | "status" | "notes">>
): Blocker | null {
  const idx = store.blockers.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const ts = now();
  store.blockers[idx] = {
    ...store.blockers[idx],
    ...patch,
    updatedAt: ts,
  };
  return store.blockers[idx];
}

export function addMemoryItem(item: Omit<MemoryItem, "id" | "createdAt">): MemoryItem {
  const id = `mem-${Date.now()}`;
  const full: MemoryItem = { ...item, id, createdAt: now() };
  store.memories.push(full);
  return full;
}

export function addScheduleBlock(block: Omit<ScheduleBlock, "id">): ScheduleBlock {
  const id = `sched-${Date.now()}`;
  const item: ScheduleBlock = { ...block, id };
  store.schedule.push(item);
  return item;
}
