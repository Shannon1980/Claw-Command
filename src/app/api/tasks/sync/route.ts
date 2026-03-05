import { NextResponse } from "next/server";
import { listSessions, isGatewayOnline } from "@/lib/openclaw/client";
import { syncTasksFromSessions } from "@/lib/tasks/sync";

export const dynamic = "force-dynamic";

/**
 * POST /api/tasks/sync
 * Sync OpenClaw sessions to tasks table.
 */
export async function POST() {
  try {
    const online = await isGatewayOnline();
    if (!online) {
      return NextResponse.json(
        { error: "OpenClaw gateway is offline or unreachable" },
        { status: 503 }
      );
    }

    const sessions = await listSessions();
    const result = await syncTasksFromSessions(sessions);

    if (result.error) {
      return NextResponse.json(
        { error: result.error, ...result },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tasksSynced: result.tasksSynced,
      agentsUpserted: result.agentsUpserted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Tasks Sync API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Task sync failed" },
      { status: 500 }
    );
  }
}
