import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  if (!pool) {
    return NextResponse.json({
      activeSessions: 0,
      totalSessions: 0,
      agentsOnline: 0,
      totalAgents: 0,
      tasksRunning: 0,
      totalTasks: 0,
      errors24h: 0,
      auditEvents24h: 0,
      auditEvents7d: 0,
      webhooksConfigured: 0,
      unreadNotifications: 0,
      tasksByStatus: {},
    });
  }

  try {
    const [
      agentsRes,
      tasksRes,
      tasksByStatusRes,
      activities24hRes,
      activities7dRes,
      webhooksRes,
      notificationsRes,
    ] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status != 'idle') AS active,
           COUNT(*) AS total
         FROM agents
         WHERE retired_at IS NULL`
      ),
      pool.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'in_progress') AS running
         FROM tasks`
      ),
      pool.query(
        `SELECT status, COUNT(*)::int AS count FROM tasks GROUP BY status`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM activities WHERE created_at::timestamptz > NOW() - INTERVAL '24 hours'`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM activities WHERE created_at::timestamptz > NOW() - INTERVAL '7 days'`
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM webhooks`).catch(() => ({
        rows: [{ count: 0 }],
      })),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM notifications WHERE read_at IS NULL`
      ).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const tasksByStatus: Record<string, number> = {};
    for (const row of tasksByStatusRes.rows) {
      tasksByStatus[row.status] = row.count;
    }

    return NextResponse.json({
      activeSessions: 0,
      totalSessions: 0,
      agentsOnline: Number(agentsRes.rows[0].active),
      totalAgents: Number(agentsRes.rows[0].total),
      tasksRunning: Number(tasksRes.rows[0].running),
      totalTasks: Number(tasksRes.rows[0].total),
      errors24h: 0,
      auditEvents24h: activities24hRes.rows[0].count,
      auditEvents7d: activities7dRes.rows[0].count,
      webhooksConfigured: webhooksRes.rows[0].count,
      unreadNotifications: notificationsRes.rows[0].count,
      tasksByStatus,
    });
  } catch (error) {
    console.error("[Overview Stats] Error:", error);
    return NextResponse.json({
      activeSessions: 0,
      totalSessions: 0,
      agentsOnline: 0,
      totalAgents: 0,
      tasksRunning: 0,
      totalTasks: 0,
      errors24h: 0,
      auditEvents24h: 0,
      auditEvents7d: 0,
      webhooksConfigured: 0,
      unreadNotifications: 0,
      tasksByStatus: {},
    });
  }
}
