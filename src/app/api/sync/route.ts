import { NextResponse } from "next/server";
import { listSessions, isGatewayOnline } from "@/lib/openclaw/client";
import { mapSessionsToAgentStatus, mapSessionsToActivities } from "@/lib/openclaw/mappers";
import type { SyncResult } from "@/lib/openclaw/types";

export async function POST() {
  const timestamp = new Date().toISOString();

  // Check gateway connectivity
  const online = await isGatewayOnline();
  if (!online) {
    const result: SyncResult = {
      agentsUpdated: 0,
      tasksSynced: 0,
      activitiesCreated: 0,
      timestamp,
      error: "OpenClaw gateway is offline or unreachable",
    };
    return NextResponse.json(result, { status: 503 });
  }

  try {
    // Fetch sessions from OpenClaw
    const sessions = await listSessions();

    // Map to Claw Command entities
    const agentUpdates = mapSessionsToAgentStatus(sessions);
    const activities = mapSessionsToActivities(sessions);

    // TODO: Upsert to database when DB is connected
    // For now, return the mapped data
    console.log(
      `[Sync] ${agentUpdates.length} agent updates, ${activities.length} activities from ${sessions.length} sessions`
    );

    const result: SyncResult = {
      agentsUpdated: agentUpdates.length,
      tasksSynced: 0, // TODO: implement task sync
      activitiesCreated: activities.length,
      timestamp,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Sync] Error during sync:", error);
    const result: SyncResult = {
      agentsUpdated: 0,
      tasksSynced: 0,
      activitiesCreated: 0,
      timestamp,
      error: error instanceof Error ? error.message : "Unknown sync error",
    };
    return NextResponse.json(result, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to trigger a sync",
    gateway: process.env.OPENCLAW_GATEWAY_URL || "http://localhost:4444",
  });
}
