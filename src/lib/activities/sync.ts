/**
 * Sync OpenClaw sessions to activities table.
 * Inserts new activities, upserts agents, archives entries older than 7 days.
 */

import {
  listSessions,
  isGatewayOnline,
} from "@/lib/openclaw/client";
import {
  mapSessionsToAgentStatus,
  mapSessionsToActivities,
} from "@/lib/openclaw/mappers";
import { pool } from "@/lib/db/client";
import { upsertAgents } from "@/lib/db/upsertAgents";
import type { ActivityEvent } from "@/lib/openclaw/types";

const ARCHIVE_DAYS = 7;

export type SyncActivitiesResult = {
  newActivities: ActivityEvent[];
  agentsUpserted: number;
  archivedCount: number;
  error?: string;
};

export async function syncActivities(): Promise<SyncActivitiesResult> {
  const result: SyncActivitiesResult = {
    newActivities: [],
    agentsUpserted: 0,
    archivedCount: 0,
  };

  if (!pool) {
    result.error = "Database not configured";
    return result;
  }

  try {
    const online = await isGatewayOnline();
    if (!online) {
      result.error = "OpenClaw gateway is offline";
      return result;
    }

    const sessions = await listSessions();
    const agentUpdates = mapSessionsToAgentStatus(sessions);
    const activities = mapSessionsToActivities(sessions);

    // Upsert agents
    result.agentsUpserted = await upsertAgents(agentUpdates);

    // Insert new activities (skip duplicates)
    for (const act of activities) {
      const existing = await pool.query(
        "SELECT id FROM activities WHERE id = $1",
        [act.id]
      );
      if (existing.rows.length > 0) continue;

      await pool.query(
        `INSERT INTO activities (id, actor_agent_id, event_type, resource_type, resource_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          act.id,
          act.actorAgentId,
          act.eventType,
          act.resourceType,
          act.resourceId,
          act.details,
          act.createdAt,
        ]
      );
      result.newActivities.push(act);
    }

    // Archive activities older than 7 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ARCHIVE_DAYS);
    const cutoffIso = cutoff.toISOString();

    // Create archive table if not exists (idempotent)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities_archive (
        id TEXT PRIMARY KEY,
        actor_agent_id TEXT,
        event_type TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        archived_at TEXT NOT NULL DEFAULT NOW()::text
      )
    `);

    const toArchive = await pool.query(
      "SELECT * FROM activities WHERE created_at < $1",
      [cutoffIso]
    );

    for (const row of toArchive.rows) {
      await pool.query(
        `INSERT INTO activities_archive (id, actor_agent_id, event_type, resource_type, resource_id, details, created_at, archived_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          row.id,
          row.actor_agent_id,
          row.event_type,
          row.resource_type,
          row.resource_id,
          row.details,
          row.created_at,
          new Date().toISOString(),
        ]
      );
      await pool.query("DELETE FROM activities WHERE id = $1", [row.id]);
      result.archivedCount++;
    }
  } catch (err) {
    console.error("[syncActivities] Error:", err);
    result.error = err instanceof Error ? err.message : "Sync failed";
  }

  return result;
}
