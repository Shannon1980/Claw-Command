import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { z } from "zod";
import { connectionString } from "@/lib/db/config";
import { pushTaskToOpenClaw } from "@/lib/openclaw/client";
import { emitTaskUpdate } from "@/lib/events/emitActivity";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  status: z
    .enum([
      "inbox",
      "backlog",
      "in_progress",
      "review",
      "quality_review",
      "blocked",
      "done",
    ])
    .optional()
    .default("backlog"),
  priority: z.enum(["high", "medium", "low"]).optional().default("medium"),
  assigned_to_agent_id: z.string().nullable().optional(),
  depends_on_shannon: z.boolean().optional().default(false),
  due_date: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  ticket_ref: z.string().nullable().optional(),
  parent_opportunity_id: z.string().nullable().optional(),
  parent_application_id: z.string().nullable().optional(),
});

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const agent = searchParams.get("agent");
  const project = searchParams.get("project");
  const priority = searchParams.get("priority");
  const all = searchParams.get("all") === "true";
  const dependsOnShannon = searchParams.get("depends_on_shannon");
  const search = searchParams.get("search");

  try {
    let query = `
      SELECT t.id, t.title, t.description, t.assigned_to_agent_id, t.depends_on_shannon,
             t.status, t.priority, t.due_date, t.project, t.ticket_ref,
             t.parent_opportunity_id, t.parent_application_id,
             t.created_at, t.updated_at,
             a.name as agent_name, a.emoji as agent_emoji, a.domain as agent_domain
      FROM tasks t
      LEFT JOIN agents a ON t.assigned_to_agent_id = a.id
    `;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`t.status = $${paramIndex++}`);
      values.push(status);
    }

    if (agent) {
      if (agent === "shannon") {
        conditions.push("t.assigned_to_agent_id IS NULL");
      } else {
        conditions.push(`t.assigned_to_agent_id = $${paramIndex++}`);
        values.push(agent);
      }
    }

    if (project) {
      conditions.push(`t.project = $${paramIndex++}`);
      values.push(project);
    }

    if (priority) {
      conditions.push(`t.priority = $${paramIndex++}`);
      values.push(priority);
    }

    if (dependsOnShannon === "true" && !all) {
      conditions.push("t.depends_on_shannon = true");
    }

    if (search) {
      conditions.push(`t.title ILIKE $${paramIndex++}`);
      values.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query +=
      " ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 2 END, t.due_date ASC NULLS LAST, t.updated_at DESC";

    const result = await pool.query(query, values);
    const rows = result.rows.map((row: Record<string, unknown>) => ({
      ...row,
      agent_name: row.agent_name ?? "Shannon",
      agent_emoji: row.agent_emoji ?? "👤",
    }));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[Tasks API] Error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured. Set DATABASE_URL or POSTGRES_URL." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = CreateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Empty, null, or "shannon" = assign to Shannon (null)
    const rawAssigned = data.assigned_to_agent_id;
    const assignedToMe =
      rawAssigned == null ||
      rawAssigned === "" ||
      String(rawAssigned).toLowerCase() === "shannon";
    const assignedToAgentId = assignedToMe ? null : rawAssigned;

    const id = generateTaskId();
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO tasks (id, title, description, assigned_to_agent_id, depends_on_shannon,
        status, priority, due_date, project, ticket_ref,
        parent_opportunity_id, parent_application_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)`,
      [
        id,
        data.title,
        data.description,
        assignedToAgentId,
        data.depends_on_shannon,
        data.status,
        data.priority,
        data.due_date ?? null,
        data.project ?? null,
        data.ticket_ref ?? null,
        data.parent_opportunity_id ?? null,
        data.parent_application_id ?? null,
        now,
      ]
    );

    // Push to OpenClaw only when assigned to an agent (not Shannon)
    if (assignedToAgentId) {
      const pushResult = await pushTaskToOpenClaw({
        taskId: id,
        title: data.title,
        agentId: assignedToAgentId,
        status: data.status,
        dueDate: data.due_date ?? null,
      });
      if (!pushResult.ok) {
        console.warn("[Tasks API] OpenClaw push failed:", pushResult.error);
      }
    }

    // Fetch agent info for response
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

    const task = {
      id,
      title: data.title,
      description: data.description,
      assigned_to_agent_id: assignedToAgentId,
      depends_on_shannon: data.depends_on_shannon,
      status: data.status,
      priority: data.priority,
      due_date: data.due_date ?? null,
      project: data.project ?? null,
      ticket_ref: data.ticket_ref ?? null,
      parent_opportunity_id: data.parent_opportunity_id ?? null,
      parent_application_id: data.parent_application_id ?? null,
      created_at: now,
      updated_at: now,
      agent_name: agentName,
      agent_emoji: agentEmoji,
    };

    emitTaskUpdate({ taskId: id, action: "created", task });

    return NextResponse.json(task);
  } catch (error) {
    console.error("[Tasks API] Create error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
