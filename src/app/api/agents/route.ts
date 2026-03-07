import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitAgentStatus } from "@/lib/events/emitActivity";
import { logAuditEvent } from "@/lib/events/auditLog";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET() {
  if (!pool) {
    return NextResponse.json([]);
  }

  try {
    const result = await pool.query(
      `SELECT id, name, emoji, domain, status, current_task_id, soul, capabilities, api_key, updated_at
       FROM agents
       WHERE retired_at IS NULL
       ORDER BY domain, name`
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
