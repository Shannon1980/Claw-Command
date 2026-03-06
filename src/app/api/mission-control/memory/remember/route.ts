import { NextRequest, NextResponse } from "next/server";
import { addMemoryItem } from "@/lib/mission-control/mcStore";
import { isMcDbAvailable, dbAddMemory } from "@/lib/mission-control/mcDb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = {
      content: body.content ?? "",
      source: body.source,
      tags: body.tags,
    };
    if (isMcDbAvailable()) {
      try {
        const item = await dbAddMemory(payload);
        return NextResponse.json(item);
      } catch {
        // fallback
      }
    }
    const item = addMemoryItem(payload);
    return NextResponse.json(item);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to remember" },
      { status: 500 }
    );
  }
}
