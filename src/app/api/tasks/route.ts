import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { pushTaskToOpenClaw } from "@/lib/openclaw/client";

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(request: NextRequest) {
  if (!pool || !connectionString) {
    return NextResponse.json(
      { error: "Database not configured. Set DATABASE_URL or POSTGRES_URL." },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    const title = (body.title as string)?.trim();
    const rawAssigned = body.assigned_to_agent_id as string | null | undefined;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Empty, null, or "shannon" = assign to me (Shannon)
    const assignedToMe =
      rawAssigned == null ||
      rawAssigned === "" ||
      String(rawAssigned).toLowerCase() === "shannon";
    const assignedToAgentId = assignedToMe ? null : rawAssigned;

    const id = generateTaskId();
    const now = new Date().toISOString();
    const status = body.status || "backlog";
    const priority = ["high", "medium", "low"].includes(body.priority) ? body.priority : "medium";
    const dueDate = body.due_date || null;
    const dependsOnShannon = Boolean(body.depends_on_shannon);

    await pool.query(
      `INSERT INTO tasks (id, title, assigned_to_agent_id, depends_on_shannon, status, priority, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      [id, title, assignedToAgentId, dependsOnShannon, status, priority, dueDate, now]
    );

    // Push to OpenClaw only when assigned to an agent (not to me)
    if (assignedToAgentId) {
      const pushResult = await pushTaskToOpenClaw({
        taskId: id,
        title,
        agentId: assignedToAgentId,
        status,
        dueDate: dueDate,
      });
      if (!pushResult.ok) {
        console.warn("[Tasks API] OpenClaw push failed:", pushResult.error);
      }
    }

    let agentName = "Shannon";
    let agentEmoji = "👤";
    if (assignedToAgentId) {
      const agentRes = await pool.query(
        "SELECT name, emoji FROM agents WHERE id = $1",
        [assignedToAgentId]
      );
      agentName = agentRes.rows[0]?.name ?? agentName;
      agentEmoji = agentRes.rows[0]?.emoji ?? agentEmoji;
    }

    return NextResponse.json({
      id,
      title,
      assigned_to_agent_id: assignedToAgentId,
      depends_on_shannon: dependsOnShannon,
      status,
      priority,
      due_date: dueDate,
      created_at: now,
      updated_at: now,
      agent_name: agentName,
      agent_emoji: agentEmoji,
    });
  } catch (error) {
    console.error("[Tasks API] Create error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!pool || !connectionString) {
    return NextResponse.json([], { status: 200 });
  }
  const { searchParams } = new URL(request.url);
  const dependsOnShannon = searchParams.get("depends_on_shannon");
  const agent = searchParams.get("agent");
  const all = searchParams.get("all") === "true";

  try {
    let query = `
      SELECT t.id, t.title, t.assigned_to_agent_id, t.depends_on_shannon, 
             t.status, t.priority, t.due_date, t.created_at, t.updated_at,
             a.name as agent_name, a.emoji as agent_emoji, a.domain as agent_domain
      FROM tasks t
      LEFT JOIN agents a ON t.assigned_to_agent_id = a.id
    `;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dependsOnShannon === "true" && !all) {
      conditions.push("t.depends_on_shannon = true");
    }
    if (agent) {
      if (agent === "shannon") {
        conditions.push("t.assigned_to_agent_id IS NULL");
      } else {
        conditions.push(`t.assigned_to_agent_id = $${paramIndex++}`);
        values.push(agent);
      }
    }
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 2 END, t.due_date ASC NULLS LAST, t.updated_at DESC";

    const result = await pool.query(query, values);
    const rows = result.rows.map((row: Record<string, unknown>) => ({
      ...row,
      agent_name: row.agent_name ?? "Shannon",
      agent_emoji: row.agent_emoji ?? "👤",
    }));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[Tasks API] Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
