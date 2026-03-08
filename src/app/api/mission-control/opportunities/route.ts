import { NextRequest, NextResponse } from "next/server";
import { getMCStore, addOpportunity } from "@/lib/mission-control/mcStore";
import { isMcDbAvailable, dbGetOpportunities, dbAddOpportunity } from "@/lib/mission-control/mcDb";

export async function GET() {
  if (isMcDbAvailable()) {
    try {
      const data = await dbGetOpportunities();
      return NextResponse.json(data);
    } catch {
      // fallback to store
    }
  }
  const store = getMCStore();
  return NextResponse.json(store.opportunities);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = {
      title: body.title ?? "Untitled",
      stage: body.stage ?? "identify",
      valueUsd: body.valueUsd,
      probability: body.probability,
      ownerAgentId: body.ownerAgentId,
      notes: body.notes,
    };
    if (isMcDbAvailable()) {
      try {
        const opp = await dbAddOpportunity(payload);
        return NextResponse.json(opp);
      } catch {
        // fallback
      }
    }
    const opp = addOpportunity(payload);
    return NextResponse.json(opp);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create" },
      { status: 500 }
    );
  }
}
