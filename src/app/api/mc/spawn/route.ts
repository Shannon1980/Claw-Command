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

/**
 * Mission Control–compatible spawn.
 * POST /api/mc/spawn
 * Body: { agent: "veronica", task?: "Task title", params?: {} }
 * Creates a task in Claw-Command and pushes to OpenClaw.
 * See: https://github.com/builderz-labs/mission-control
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const agent = (body.agent as string)?.trim();
    const taskTitle = (body.task as string)?.trim();

    if (!agent) {
      return NextResponse.json(
        { error: "agent is required" },
        { status: 400 }
      );
    }

    const title = taskTitle || `Spawned task for ${agent}`;

    if (pool && connectionString) {
      const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();

      await pool.query(
        `INSERT INTO tasks (id, title, assigned_to_agent_id, depends_on_shannon, status, priority, created_at, updated_at)
         VALUES ($1, $2, $3, false, 'ready', 'medium', $4, $4)`,
        [id, title, agent, now]
      );

      const pushResult = await pushTaskToOpenClaw({
        taskId: id,
        title,
        agentId: agent,
        status: "ready",
      });

      return NextResponse.json({
        success: pushResult.ok,
        session_id: pushResult.sessionId,
        task_id: id,
        error: pushResult.error,
      });
    }

    const pushResult = await pushTaskToOpenClaw({
      taskId: `spawn-${Date.now()}`,
      title,
      agentId: agent,
      status: "ready",
    });

    return NextResponse.json({
      success: pushResult.ok,
      session_id: pushResult.sessionId,
      error: pushResult.error,
    });
  } catch (error) {
    console.error("[MC Spawn] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Spawn failed" },
      { status: 500 }
    );
  }
}
