import { NextResponse } from "next/server";
import { syncActivities } from "@/lib/activities/sync";

export const dynamic = "force-dynamic";

/**
 * POST /api/activities/sync
 * Sync OpenClaw sessions to activities table, archive entries older than 7 days.
 */
export async function POST() {
  const result = await syncActivities();

  if (result.error) {
    return NextResponse.json(
      { error: result.error, ...result },
      { status: 503 }
    );
  }

  return NextResponse.json({
    success: true,
    newActivities: result.newActivities.length,
    agentsUpserted: result.agentsUpserted,
    archivedCount: result.archivedCount,
    timestamp: new Date().toISOString(),
  });
}
