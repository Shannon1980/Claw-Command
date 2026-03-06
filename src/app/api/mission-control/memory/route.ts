import { NextResponse } from "next/server";
import { getMCStore } from "@/lib/mission-control/mcStore";
import { seedFromMemory } from "@/lib/mission-control/memoryAdapter";
import { isMcDbAvailable, dbGetMemories } from "@/lib/mission-control/mcDb";

export async function GET() {
  if (isMcDbAvailable()) {
    try {
      const data = await dbGetMemories();
      if (data.length > 0) return NextResponse.json(data);
      // fall through to seed
    } catch {
      // fallback
    }
  }
  const store = getMCStore();
  if (store.memories.length === 0) {
    await seedFromMemory();
  }
  if (isMcDbAvailable()) {
    try {
      const data = await dbGetMemories();
      return NextResponse.json(data);
    } catch {
      // fallback
    }
  }
  const updated = getMCStore();
  return NextResponse.json(updated.memories);
}
