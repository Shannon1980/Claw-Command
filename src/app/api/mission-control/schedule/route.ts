import { NextRequest, NextResponse } from "next/server";
import { getMCStore, addScheduleBlock } from "@/lib/mission-control/mcStore";
import { isMcDbAvailable, dbGetSchedule, dbAddScheduleBlock } from "@/lib/mission-control/mcDb";

export async function GET() {
  if (isMcDbAvailable()) {
    try {
      const data = await dbGetSchedule();
      return NextResponse.json(data);
    } catch {
      // fallback
    }
  }
  const store = getMCStore();
  return NextResponse.json(store.schedule);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = {
      title: body.title ?? "Untitled",
      start: body.start ?? new Date().toISOString(),
      end: body.end ?? new Date().toISOString(),
      agentId: body.agentId,
      type: body.type,
      notes: body.notes,
    };
    if (isMcDbAvailable()) {
      try {
        const block = await dbAddScheduleBlock(payload);
        return NextResponse.json(block);
      } catch {
        // fallback
      }
    }
    const block = addScheduleBlock(payload);
    return NextResponse.json(block);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create" },
      { status: 500 }
    );
  }
}
