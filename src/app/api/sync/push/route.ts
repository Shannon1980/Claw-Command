import { NextResponse } from "next/server";
import { listSessions, isGatewayOnline } from "@/lib/openclaw/client";
import { mapSessionsToAgentStatus, mapSessionsToActivities } from "@/lib/openclaw/mappers";

/**
 * Trigger manual sync with OpenClaw gateway
 * POST /api/sync/push
 */
export async function POST(req: Request) {
  try {
    const online = await isGatewayOnline();
    if (!online) {
      return NextResponse.json(
        { error: "OpenClaw gateway is offline or unreachable" },
        { status: 503 }
      );
    }

    // Fetch sessions from OpenClaw
    const sessions = await listSessions();

    // Map to Claw Command format
    const agentUpdates = mapSessionsToAgentStatus(sessions);
    const activities = mapSessionsToActivities(sessions);

    // TODO: Ideally we'd push these into the DB or broadcast them via SSE
    // For now, just returning them to confirm the sync worked
    // In a real implementation, you'd insert into "agents" and "activity_log" tables

    return NextResponse.json({
      success: true,
      agentsUpdated: agentUpdates.length,
      activitiesCreated: activities.length,
      timestamp: new Date().toISOString(),
      updates: {
        agents: agentUpdates,
        activities: activities.slice(0, 5), // Just show first 5
      }
    });
  } catch (error) {
    console.error("[Sync API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
