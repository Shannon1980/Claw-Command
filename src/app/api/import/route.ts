import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

interface AgentInput {
  id: string;
  name: string;
  emoji?: string;
  domain: string;
  status?: string;
  currentTaskId?: string | null;
}

interface TaskInput {
  id: string;
  title: string;
  assignedToAgentId: string;
  dependsOnShannon?: boolean;
  status?: string;
  dueDate?: string | null;
}

interface OpportunityInput {
  id: string;
  title: string;
  stage: string;
  valueUsd?: number;
  probability?: number;
  ownerAgentId: string;
  shannonApproval?: boolean | null;
}

interface ImportPayload {
  agents?: AgentInput[];
  tasks?: TaskInput[];
  opportunities?: OpportunityInput[];
}

export async function POST(request: NextRequest) {
  if (!connectionString) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const body: ImportPayload = await request.json();
    const now = new Date().toISOString();
    const client = await pool.connect();

    const result = { agents: 0, tasks: 0, opportunities: 0 };

    try {
      await client.query("BEGIN");

      // Import agents first (tasks/opportunities reference them)
      if (body.agents && body.agents.length > 0) {
        for (const a of body.agents) {
          await client.query(
            `INSERT INTO agents (id, name, emoji, domain, status, current_task_id, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               emoji = EXCLUDED.emoji,
               domain = EXCLUDED.domain,
               status = EXCLUDED.status,
               current_task_id = EXCLUDED.current_task_id,
               updated_at = EXCLUDED.updated_at`,
            [
              a.id,
              a.name,
              a.emoji ?? "📄",
              a.domain,
              a.status ?? "idle",
              a.currentTaskId ?? null,
              now,
            ]
          );
          result.agents++;
        }
      }

      // Import opportunities
      if (body.opportunities && body.opportunities.length > 0) {
        for (const o of body.opportunities) {
          await client.query(
            `INSERT INTO opportunities (id, title, stage, value_usd, probability, owner_agent_id, shannon_approval, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               stage = EXCLUDED.stage,
               value_usd = EXCLUDED.value_usd,
               probability = EXCLUDED.probability,
               owner_agent_id = EXCLUDED.owner_agent_id,
               shannon_approval = EXCLUDED.shannon_approval,
               updated_at = EXCLUDED.updated_at`,
            [
              o.id,
              o.title,
              o.stage,
              o.valueUsd ?? 0,
              o.probability ?? 0,
              o.ownerAgentId,
              o.shannonApproval ?? null,
              now,
            ]
          );
          result.opportunities++;
        }
      }

      // Import tasks
      if (body.tasks && body.tasks.length > 0) {
        for (const t of body.tasks) {
          await client.query(
            `INSERT INTO tasks (id, title, assigned_to_agent_id, depends_on_shannon, status, due_date, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               assigned_to_agent_id = EXCLUDED.assigned_to_agent_id,
               depends_on_shannon = EXCLUDED.depends_on_shannon,
               status = EXCLUDED.status,
               due_date = EXCLUDED.due_date,
               updated_at = EXCLUDED.updated_at`,
            [
              t.id,
              t.title,
              t.assignedToAgentId,
              t.dependsOnShannon ?? false,
              t.status ?? "backlog",
              t.dueDate ?? null,
              now,
            ]
          );
          result.tasks++;
        }
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        imported: result,
        timestamp: now,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[Import API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Import failed",
      },
      { status: 500 }
    );
  }
}
