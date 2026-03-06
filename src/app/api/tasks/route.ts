import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = (body.title as string)?.trim();
    const assignedToAgentId = body.assigned_to_agent_id as string;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    if (!assignedToAgentId) {
      return NextResponse.json(
        { error: "Assigned agent is required" },
        { status: 400 }
      );
    }

    const id = generateTaskId();
    const now = new Date().toISOString();
    const status = body.status || "backlog";
    const dueDate = body.due_date || null;
    const dependsOnShannon = Boolean(body.depends_on_shannon);

    await pool.query(
      `INSERT INTO tasks (id, title, assigned_to_agent_id, depends_on_shannon, status, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [id, title, assignedToAgentId, dependsOnShannon, status, dueDate, now]
    );

    const agentRes = await pool.query(
      "SELECT name, emoji FROM agents WHERE id = $1",
      [assignedToAgentId]
    );

    return NextResponse.json({
      id,
      title,
      assigned_to_agent_id: assignedToAgentId,
      depends_on_shannon: dependsOnShannon,
      status,
      due_date: dueDate,
      created_at: now,
      updated_at: now,
      agent_name: agentRes.rows[0]?.name,
      agent_emoji: agentRes.rows[0]?.emoji,
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
  const { searchParams } = new URL(request.url);
  const dependsOnShannon = searchParams.get("depends_on_shannon");
  const agent = searchParams.get("agent");
  const all = searchParams.get("all") === "true";

  try {
    let query = `
      SELECT t.id, t.title, t.assigned_to_agent_id, t.depends_on_shannon, 
             t.status, t.due_date, t.created_at, t.updated_at,
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
      conditions.push(`t.assigned_to_agent_id = $${paramIndex++}`);
      values.push(agent);
    }
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY t.due_date ASC NULLS LAST, t.updated_at DESC";

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Tasks API] Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
