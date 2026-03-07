import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitAgentStatus } from "@/lib/events/emitActivity";
import { logAuditEvent } from "@/lib/events/auditLog";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const result = await pool.query(
      `SELECT a.*, s.personality, s.capabilities AS soul_capabilities, s.system_prompt, s.constraints
       FROM agents a
       LEFT JOIN agent_souls s ON s.agent_id = a.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Agent GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch agent" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields: Record<string, string> = {
      name: "name",
      emoji: "emoji",
      domain: "domain",
      status: "status",
      currentTaskId: "current_task_id",
      soul: "soul",
      capabilities: "capabilities",
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [bodyKey, dbColumn] of Object.entries(allowedFields)) {
      if (bodyKey in body) {
        setClauses.push(`${dbColumn} = $${paramIndex}`);
        values.push(body[bodyKey]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    setClauses.push(`updated_at = NOW()::text`);
    values.push(id);

    const result = await pool.query(
      `UPDATE agents SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    emitAgentStatus({
      agentId: id,
      status: result.rows[0].status,
      ...body,
    });

    logAuditEvent({ action: "agent_updated", resourceType: "agent", resourceId: id });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Agent PATCH] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update agent" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const result = await pool.query(
      `UPDATE agents SET retired_at = NOW()::text, updated_at = NOW()::text WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    emitAgentStatus({ agentId: id, status: "retired" });

    logAuditEvent({ action: "agent_retired", resourceType: "agent", resourceId: id });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Agent DELETE] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retire agent" },
      { status: 500 }
    );
  }
}
