/**
 * Mission Control persistence via Drizzle + Postgres.
 * Used when DATABASE_URL is set; falls back to in-memory mcStore otherwise.
 */

import { connectionString } from "@/lib/db/config";
import { db } from "@/lib/db/client";
import {
  mcOpportunities,
  mcTeachingTasks,
  mcBlockers,
  mcSchedule,
  mcMemories,
} from "@/lib/db/schema";
import type {
  Opportunity,
  TeachingTask,
  Blocker,
  ScheduleBlock,
  MemoryItem,
} from "./mc_types";

const now = () => new Date().toISOString();

export function isMcDbAvailable(): boolean {
  return !!connectionString;
}

export async function dbGetOpportunities(): Promise<Opportunity[]> {
  const rows = await db.select().from(mcOpportunities);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    stage: r.stage,
    valueUsd: r.valueUsd ?? undefined,
    probability: r.probability ?? undefined,
    ownerAgentId: r.ownerAgentId ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function dbAddOpportunity(
  opp: Omit<Opportunity, "id" | "createdAt" | "updatedAt">
): Promise<Opportunity> {
  const id = `opp-${Date.now()}`;
  const ts = now();
  await db.insert(mcOpportunities).values({
    id,
    title: opp.title,
    stage: opp.stage ?? "identify",
    valueUsd: opp.valueUsd ?? null,
    probability: opp.probability ?? null,
    ownerAgentId: opp.ownerAgentId ?? null,
    notes: opp.notes ?? null,
    createdAt: ts,
    updatedAt: ts,
  });
  return { ...opp, id, createdAt: ts, updatedAt: ts };
}

export async function dbGetTeachingTasks(): Promise<TeachingTask[]> {
  const rows = await db.select().from(mcTeachingTasks);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status as TeachingTask["status"],
    priority: (r.priority as TeachingTask["priority"]) ?? undefined,
    assignedToAgentId: r.assignedToAgentId ?? undefined,
    dueDate: r.dueDate ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function dbAddTeachingTask(
  task: Omit<TeachingTask, "id" | "createdAt" | "updatedAt">
): Promise<TeachingTask> {
  const id = `task-${Date.now()}`;
  const ts = now();
  await db.insert(mcTeachingTasks).values({
    id,
    title: task.title,
    status: task.status ?? "backlog",
    priority: task.priority ?? null,
    assignedToAgentId: task.assignedToAgentId ?? null,
    dueDate: task.dueDate ?? null,
    notes: task.notes ?? null,
    createdAt: ts,
    updatedAt: ts,
  });
  return { ...task, id, createdAt: ts, updatedAt: ts };
}

export async function dbGetBlockers(): Promise<Blocker[]> {
  const rows = await db.select().from(mcBlockers);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type as Blocker["type"],
    status: r.status as Blocker["status"],
    notes: r.notes ?? undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function dbAddBlocker(
  blocker: Omit<Blocker, "id" | "createdAt" | "updatedAt">
): Promise<Blocker> {
  const id = `block-${Date.now()}`;
  const ts = now();
  await db.insert(mcBlockers).values({
    id,
    title: blocker.title,
    type: blocker.type ?? "note",
    status: blocker.status ?? "open",
    notes: blocker.notes ?? null,
    createdAt: ts,
    updatedAt: ts,
  });
  return { ...blocker, id, createdAt: ts, updatedAt: ts };
}

export async function dbGetSchedule(): Promise<ScheduleBlock[]> {
  const rows = await db.select().from(mcSchedule);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    start: r.start,
    end: r.end,
    agentId: r.agentId ?? undefined,
    type: (r.type as ScheduleBlock["type"]) ?? undefined,
    notes: r.notes ?? undefined,
  }));
}

export async function dbAddScheduleBlock(
  block: Omit<ScheduleBlock, "id">
): Promise<ScheduleBlock> {
  const id = `sched-${Date.now()}`;
  await db.insert(mcSchedule).values({
    id,
    title: block.title,
    start: block.start,
    end: block.end,
    agentId: block.agentId ?? null,
    type: block.type ?? null,
    notes: block.notes ?? null,
  });
  return { ...block, id };
}

export async function dbGetMemories(): Promise<MemoryItem[]> {
  const rows = await db.select().from(mcMemories);
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    source: r.source ?? undefined,
    tags: r.tags ? (JSON.parse(r.tags) as string[]) : undefined,
    createdAt: r.createdAt,
  }));
}

export async function dbAddMemory(
  item: Omit<MemoryItem, "id" | "createdAt">
): Promise<MemoryItem> {
  const id = `mem-${Date.now()}`;
  const ts = now();
  await db.insert(mcMemories).values({
    id,
    content: item.content,
    source: item.source ?? null,
    tags: item.tags ? JSON.stringify(item.tags) : null,
    createdAt: ts,
  });
  return { ...item, id, createdAt: ts };
}
