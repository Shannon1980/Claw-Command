import { pool } from "@/lib/db/client";
import { requireMinRole } from "@/lib/auth/validateSession";
import { emitEvent } from "@/lib/events/emitActivity";
import { logAuditEvent } from "@/lib/events/auditLog";
import { NextRequest, NextResponse } from "next/server";

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      context TEXT NOT NULL DEFAULT '',
      choice TEXT NOT NULL,
      options TEXT NOT NULL DEFAULT '[]',
      reason TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'proposed',
      author_agent_id TEXT,
      shannon_approval BOOLEAN,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      actor_agent_id TEXT,
      event_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);

  schemaReady = true;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const authResult = await requireMinRole(request, "viewer");
  if (authResult instanceof NextResponse) return authResult;

  try {
    await ensureSchema();
    const { id } = await params;

    const result = await pool.query(`SELECT * FROM decisions WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Decision not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Decisions/:id GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch decision" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const authResult = await requireMinRole(request, "operator");
  if (authResult instanceof NextResponse) return authResult;

  try {
    await ensureSchema();
    const { id } = await params;
    const body = await request.json();

    const currentResult = await pool.query(`SELECT * FROM decisions WHERE id = $1`, [id]);
    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: "Decision not found" }, { status: 404 });
    }

    const current = currentResult.rows[0];
    const now = new Date().toISOString();

    let existingOptions: unknown[] = [];
    try {
      existingOptions = JSON.parse(current.options || "[]");
      if (!Array.isArray(existingOptions)) existingOptions = [];
    } catch {
      existingOptions = [];
    }

    const updatedResult = await pool.query(
      `UPDATE decisions
       SET title = $2,
           context = $3,
           choice = $4,
           options = $5,
           reason = $6,
           status = $7,
           author_agent_id = $8,
           shannon_approval = $9,
           updated_at = $10
       WHERE id = $1
       RETURNING *`,
      [
        id,
        body.title ?? current.title,
        body.context ?? current.context,
        body.choice ?? current.choice,
        JSON.stringify(Array.isArray(body.options) ? body.options : existingOptions),
        body.reason ?? current.reason,
        body.status ?? current.status,
        body.authorAgentId ?? current.author_agent_id,
        typeof body.shannonApproval === "boolean" ? body.shannonApproval : current.shannon_approval,
        now,
      ]
    );

    await pool.query(
      `INSERT INTO activities (id, actor_agent_id, event_type, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        updatedResult.rows[0].author_agent_id || null,
        "decision_updated",
        "decision",
        id,
        JSON.stringify({ message: `Decision updated: ${updatedResult.rows[0].title}` }),
        now,
      ]
    );

    emitEvent("task_update", { action: "decision_updated", decisionId: id });
    await logAuditEvent({
      userId: authResult.id,
      action: "decision_updated",
      resourceType: "decision",
      resourceId: id,
      details: { previousStatus: current.status, newStatus: updatedResult.rows[0].status },
    });

    return NextResponse.json(updatedResult.rows[0]);
  } catch (error) {
    console.error("[Decisions/:id PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update decision" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const authResult = await requireMinRole(request, "admin");
  if (authResult instanceof NextResponse) return authResult;

  try {
    await ensureSchema();
    const { id } = await params;

    const deleted = await pool.query(`DELETE FROM decisions WHERE id = $1 RETURNING *`, [id]);
    if (deleted.rows.length === 0) {
      return NextResponse.json({ error: "Decision not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO activities (id, actor_agent_id, event_type, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        deleted.rows[0].author_agent_id || null,
        "decision_deleted",
        "decision",
        id,
        JSON.stringify({ message: `Decision deleted: ${deleted.rows[0].title}` }),
        now,
      ]
    );

    emitEvent("task_update", { action: "decision_deleted", decisionId: id });
    await logAuditEvent({
      userId: authResult.id,
      action: "decision_deleted",
      resourceType: "decision",
      resourceId: id,
      details: { title: deleted.rows[0].title },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Decisions/:id DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete decision" }, { status: 500 });
  }
}
