import { NextRequest, NextResponse } from "next/server";
import { getMCStore, addTeachingTask } from "@/lib/mission-control/mcStore";
import { isMcDbAvailable, dbGetTeachingTasks, dbAddTeachingTask } from "@/lib/mission-control/mcDb";

export async function GET() {
  if (isMcDbAvailable()) {
    try {
      const data = await dbGetTeachingTasks();
      return NextResponse.json(data);
    } catch {
      // fallback
    }
  }
  const store = getMCStore();
  return NextResponse.json(store.teachingTasks);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = {
      title: body.title ?? "Untitled",
      status: body.status ?? "backlog",
      priority: body.priority,
      assignedToAgentId: body.assignedToAgentId,
      dueDate: body.dueDate,
      notes: body.notes,
    };
    if (isMcDbAvailable()) {
      try {
        const task = await dbAddTeachingTask(payload);
        return NextResponse.json(task);
      } catch {
        // fallback
      }
    }
    const task = addTeachingTask(payload);
    return NextResponse.json(task);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create" },
      { status: 500 }
    );
  }
}
