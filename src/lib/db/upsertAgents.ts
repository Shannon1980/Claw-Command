import { pool } from "@/lib/db/client";
import type { AgentStatusUpdate } from "@/lib/openclaw/types";

/**
 * Upsert agents into the database from OpenClaw session data.
 * Returns the number of agents upserted.
 */
export async function upsertAgents(agentUpdates: AgentStatusUpdate[]): Promise<number> {
  if (!pool) return 0;

  let count = 0;
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
    count++;
  }
  return count;
}
