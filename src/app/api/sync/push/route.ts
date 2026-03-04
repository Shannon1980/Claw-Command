import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

interface AgentUpdate {
  id: string;
  name: string;
  emoji: string;
  domain: string;
  status: string;
  currentTask: string | null;
}

interface ActivityPush {
  id: string;
  actorAgentId: string | null;
  eventType: string;
  resourceType: string;
  resourceId: string;
  details: string;
}

interface SyncPayload {
  agents?: AgentUpdate[];
  activities?: ActivityPush[];
  syncKey?: string;
}

export async function POST(request: NextRequest) {
  // Simple auth via sync key
  const syncKey = process.env.SYNC_SECRET_KEY;

  try {
    const body: SyncPayload = await request.json();

    if (syncKey && body.syncKey !== syncKey) {
      return NextResponse.json({ error: "Invalid sync key" }, { status: 401 });
    }

    const client = await pool.connect();
    const now = new Date().toISOString();
    let agentsUpdated = 0;
    let activitiesCreated = 0;

    try {
      await client.query("BEGIN");

      // Upsert agent statuses
      if (body.agents && body.agents.length > 0) {
        for (const agent of body.agents) {
          await client.query(
            `INSERT INTO agents (id, name, emoji, domain, status, current_task_id, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status,
               current_task_id = EXCLUDED.current_task_id,
               updated_at = EXCLUDED.updated_at`,
            [agent.id, agent.name, agent.emoji, agent.domain, agent.status, agent.currentTask, now]
          );
          agentsUpdated++;
        }
      }

      // Insert new activities (skip duplicates)
      if (body.activities && body.activities.length > 0) {
        for (const act of body.activities) {
          const result = await client.query(
            `INSERT INTO activities (id, actor_agent_id, event_type, resource_type, resource_id, details, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO NOTHING`,
            [act.id, act.actorAgentId, act.eventType, act.resourceType, act.resourceId, act.details, now]
          );
          if (result.rowCount && result.rowCount > 0) activitiesCreated++;
        }
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        agentsUpdated,
        activitiesCreated,
        timestamp: now,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[Sync Push] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
