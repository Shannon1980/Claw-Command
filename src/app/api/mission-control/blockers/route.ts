import { NextRequest, NextResponse } from "next/server";
import { getMCStore, addBlocker } from "@/lib/mission-control/mcStore";
import { isMcDbAvailable, dbGetBlockers, dbAddBlocker } from "@/lib/mission-control/mcDb";

export async function GET() {
  if (isMcDbAvailable()) {
    try {
      const data = await dbGetBlockers();
      return NextResponse.json(data);
    } catch {
      // fallback
    }
  }
  const store = getMCStore();
  return NextResponse.json(store.blockers);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = {
      title: body.title ?? "Untitled",
      type: body.type ?? "note",
      status: body.status ?? "open",
      notes: body.notes,
    };
    if (isMcDbAvailable()) {
      try {
        const blocker = await dbAddBlocker(payload);
        return NextResponse.json(blocker);
      } catch {
        // fallback
      }
    }
    const blocker = addBlocker(payload);
    return NextResponse.json(blocker);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create" },
      { status: 500 }
    );
  }
}
