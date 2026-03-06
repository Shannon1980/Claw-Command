/**
 * Sync OpenClaw sessions to tasks table.
 * Upserts agents first (tasks reference them), then upserts tasks.
 * OpenClaw-sourced tasks use id prefix "oc-" to avoid collisions with seeded tasks.
 */

import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import type { OpenClawSession } from "@/lib/openclaw/types";
import {
  mapSessionsToAgentStatus,
  mapSessionsToTasks,
} from "@/lib/openclaw/mappers";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export type SyncTasksResult = {
  tasksSynced: number;
  agentsUpserted: number;
  error?: string;
};

export async function syncTasksFromSessions(
  sessions: OpenClawSession[]
): Promise<SyncTasksResult> {
  const result: SyncTasksResult = {
    tasksSynced: 0,
    agentsUpserted: 0,
  };

  if (!connectionString) {
    result.error = "Database not configured";
    return result;
  }

  try {
    const agentUpdates = mapSessionsToAgentStatus(sessions);
    const taskRecords = mapSessionsToTasks(sessions);

    // Upsert agents (tasks reference them)
    for (const agent of agentUpdates) {
      await pool.query(
        `INSERT INTO agents (id, name, emoji, domain, status, current_task_id, updated_at)
         VALUES ($1, $2, '🤖', 'vorentoe', $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           status = EXCLUDED.status,
           current_task_id = EXCLUDED.current_task_id,
           updated_at = EXCLUDED.updated_at`,
        [
          agent.id,
          agent.name,
          agent.status,
          agent.currentTask,
          agent.updatedAt,
        ]
      );
      result.agentsUpserted++;
    }

    // Upsert tasks (only OpenClaw-sourced, id starts with "oc-")
    // On conflict: overwrite title and status with OpenClaw's latest state
    for (const task of taskRecords) {
      await pool.query(
        `INSERT INTO tasks (id, title, assigned_to_agent_id, depends_on_shannon, status, due_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at`,
        [
          task.id,
          task.title,
          task.assigned_to_agent_id,
          task.depends_on_shannon,
          task.status,
          task.due_date,
          task.created_at,
          task.updated_at,
        ]
      );
      result.tasksSynced++;
    }
  } catch (err) {
    console.error("[syncTasksFromSessions] Error:", err);
    result.error = err instanceof Error ? err.message : "Task sync failed";
  }

  return result;
}
