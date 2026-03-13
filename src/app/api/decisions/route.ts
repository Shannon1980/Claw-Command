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

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ items: [] });

  const authResult = await requireMinRole(request, "viewer");
  if (authResult instanceof NextResponse) return authResult;

  try {
    await ensureSchema();

    const status = request.nextUrl.searchParams.get("status");
    const query = status
      ? `SELECT * FROM decisions WHERE status = $1 ORDER BY updated_at DESC`
      : `SELECT * FROM decisions ORDER BY updated_at DESC`;
    const values = status ? [status] : [];

    const result = await pool.query(query, values);
    return NextResponse.json({ items: result.rows });
  } catch (error) {
    console.error("[Decisions GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch decisions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const authResult = await requireMinRole(request, "operator");
  if (authResult instanceof NextResponse) return authResult;

  try {
    await ensureSchema();

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const choice = typeof body.choice === "string" ? body.choice.trim() : "";

    if (!title || !choice) {
      return NextResponse.json({ error: "title and choice are required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const id = `dec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const result = await pool.query(
      `INSERT INTO decisions (id, title, context, choice, options, reason, status, author_agent_id, shannon_approval, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        title,
        body.context || "",
        choice,
        JSON.stringify(Array.isArray(body.options) ? body.options : []),
        body.reason || "",
        body.status || "proposed",
        body.authorAgentId || null,
        typeof body.shannonApproval === "boolean" ? body.shannonApproval : null,
        now,
        now,
      ]
    );

    await pool.query(
      `INSERT INTO activities (id, actor_agent_id, event_type, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        body.authorAgentId || null,
        "decision_created",
        "decision",
        id,
        JSON.stringify({ message: `Decision created: ${title}`, status: body.status || "proposed" }),
        now,
      ]
    );

    emitEvent("task_update", { action: "decision_created", decisionId: id });
    await logAuditEvent({
      userId: authResult.id,
      action: "decision_created",
      resourceType: "decision",
      resourceId: id,
      details: { title, status: body.status || "proposed" },
    });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Decisions POST] Error:", error);
    return NextResponse.json({ error: "Failed to create decision" }, { status: 500 });
  }
}
