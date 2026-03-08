/**
 * Seeds all MC domains: memory from files, and default data for opportunities,
 * teaching tasks, blockers, schedule when DB is available and empty.
 */

import { seedFromMemory } from "./memoryAdapter";
import { defaultMCSeed } from "./mcStore";
import {
  isMcDbAvailable,
  dbGetOpportunities,
  dbGetTeachingTasks,
  dbGetBlockers,
  dbGetSchedule,
  dbAddOpportunity,
  dbAddTeachingTask,
  dbAddBlocker,
  dbAddScheduleBlock,
} from "./mcDb";

export type SeedResult = {
  memoriesLoaded: number;
  opportunitiesSeeded: number;
  teachingTasksSeeded: number;
  blockersSeeded: number;
  scheduleSeeded: number;
};

export async function seedAllMC(): Promise<SeedResult> {
  const result: SeedResult = {
    memoriesLoaded: 0,
    opportunitiesSeeded: 0,
    teachingTasksSeeded: 0,
    blockersSeeded: 0,
    scheduleSeeded: 0,
  };

  const mem = await seedFromMemory();
  result.memoriesLoaded = mem.memoriesLoaded;

  if (!isMcDbAvailable()) {
    return result;
  }

  const defaultSeed = defaultMCSeed;

  try {
    const opps = await dbGetOpportunities();
    if (opps.length === 0 && defaultSeed.opportunities.length > 0) {
      for (const o of defaultSeed.opportunities) {
        await dbAddOpportunity({
          title: o.title,
          stage: o.stage,
          valueUsd: o.valueUsd,
          probability: o.probability,
          ownerAgentId: o.ownerAgentId,
          notes: o.notes,
        });
        result.opportunitiesSeeded++;
      }
    }
  } catch (err) {
    console.warn("[seedAll] Opportunities seed failed:", err);
  }

  try {
    const tasks = await dbGetTeachingTasks();
    if (tasks.length === 0 && defaultSeed.teachingTasks.length > 0) {
      for (const t of defaultSeed.teachingTasks) {
        await dbAddTeachingTask({
          title: t.title,
          status: t.status,
          priority: t.priority,
          assignedToAgentId: t.assignedToAgentId,
          dueDate: undefined,
          notes: undefined,
        });
        result.teachingTasksSeeded++;
      }
    }
  } catch (err) {
    console.warn("[seedAll] Teaching tasks seed failed:", err);
  }

  try {
    const blockers = await dbGetBlockers();
    if (blockers.length === 0 && defaultSeed.blockers.length > 0) {
      for (const b of defaultSeed.blockers) {
        await dbAddBlocker({
          title: b.title,
          type: b.type as "extension" | "dependency" | "note",
          status: b.status as "open" | "resolved",
          notes: b.notes,
        });
        result.blockersSeeded++;
      }
    }
  } catch (err) {
    console.warn("[seedAll] Blockers seed failed:", err);
  }

  try {
    const schedule = await dbGetSchedule();
    if (schedule.length === 0 && defaultSeed.schedule.length > 0) {
      for (const s of defaultSeed.schedule) {
        await dbAddScheduleBlock({
          title: s.title,
          start: s.start,
          end: s.end,
          agentId: s.agentId,
          type: s.type,
          notes: s.notes,
        });
        result.scheduleSeeded++;
      }
    }
  } catch (err) {
    console.warn("[seedAll] Schedule seed failed:", err);
  }

  return result;
}
