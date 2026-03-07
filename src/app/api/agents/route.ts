import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitAgentStatus } from "@/lib/events/emitActivity";
import { logAuditEvent } from "@/lib/events/auditLog";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    ALTER TABLE agents ADD COLUMN IF NOT EXISTS soul TEXT;
    ALTER TABLE agents ADD COLUMN IF NOT EXISTS capabilities TEXT;
    ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key TEXT;
    ALTER TABLE agents ADD COLUMN IF NOT EXISTS retired_at TEXT;
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS outcome TEXT;
  `);
  schemaReady = true;
}

export async function GET() {
  if (!pool) {
    return NextResponse.json([]);
  }

  try {
    await ensureSchema();

    const result = await pool.query(
      `SELECT a.id, a.name, a.emoji, a.domain, a.status, a.current_task_id,
              a.soul, a.capabilities, a.api_key, a.updated_at,
              t.title AS task_title, t.status AS task_status, t.priority AS task_priority,
              t.due_date AS task_due_date, t.depends_on_shannon AS task_depends_on_shannon,
              (SELECT COUNT(*) FROM tasks t2 WHERE t2.assigned_to_agent_id = a.id AND t2.status NOT IN ('done')) AS open_task_count,
              (SELECT COUNT(*) FROM tasks t2 WHERE t2.assigned_to_agent_id = a.id AND t2.status = 'done') AS done_task_count
       FROM agents a
       LEFT JOIN tasks t ON a.current_task_id = t.id
       WHERE a.retired_at IS NULL
       ORDER BY a.domain, a.name`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Agents GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { name, emoji, domain, capabilities, soul } = body;

    if (!name || !domain) {
      return NextResponse.json(
        { error: "name and domain are required" },
        { status: 400 }
      );
    }

    const id = `agent-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO agents (id, name, emoji, domain, status, capabilities, soul, updated_at)
       VALUES ($1, $2, $3, $4, 'idle', $5, $6, $7)
       RETURNING *`,
      [id, name, emoji || null, domain, capabilities || null, soul || null, now]
    );

    emitAgentStatus({ agentId: id, status: "idle", name, domain });

    logAuditEvent({ action: "agent_registered", resourceType: "agent", resourceId: id });
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Agents POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create agent" },
      { status: 500 }
    );
  }
}
