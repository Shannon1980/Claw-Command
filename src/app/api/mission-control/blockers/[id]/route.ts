import { NextRequest, NextResponse } from "next/server";
import { updateBlocker } from "@/lib/mission-control/mcStore";
import { isMcDbAvailable, dbUpdateBlocker } from "@/lib/mission-control/mcDb";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing blocker id" }, { status: 400 });
  }

  try {
    const body = await _request.json();
    const patch: Record<string, unknown> = {};
    if (body.title != null) patch.title = body.title;
    if (body.type != null) patch.type = body.type;
    if (body.status != null) patch.status = body.status;
    if (body.notes != null) patch.notes = body.notes;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    if (isMcDbAvailable()) {
      try {
        const updated = await dbUpdateBlocker(id, patch as Parameters<typeof dbUpdateBlocker>[1]);
        if (!updated) {
          return NextResponse.json({ error: "Blocker not found" }, { status: 404 });
        }
        return NextResponse.json(updated);
      } catch {
        // fallback
      }
    }

    const blocker = updateBlocker(id, patch as Parameters<typeof updateBlocker>[1]);
    if (!blocker) {
      return NextResponse.json({ error: "Blocker not found" }, { status: 404 });
    }
    return NextResponse.json(blocker);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update" },
      { status: 500 }
    );
  }
}
