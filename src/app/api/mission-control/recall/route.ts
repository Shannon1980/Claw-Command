import { NextRequest, NextResponse } from "next/server";
import { getMCStore } from "@/lib/mission-control/mcStore";
import { isMcDbAvailable, dbGetMemories } from "@/lib/mission-control/mcDb";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  let memories: { content?: string; tags?: string[] }[] = [];
  if (isMcDbAvailable()) {
    try {
      memories = await dbGetMemories();
    } catch {
      // fallback
    }
  }
  if (memories.length === 0) {
    const store = getMCStore();
    memories = store.memories;
  }

  const results = query
    ? memories.filter(
        (m) =>
          m.content?.toLowerCase().includes(query.toLowerCase()) ||
          m.tags?.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      )
    : memories;

  return NextResponse.json({
    id: `recall-${Date.now()}`,
    query,
    results,
    createdAt: new Date().toISOString(),
  });
}
