import { NextResponse } from "next/server";
import { seedFromMemory } from "@/lib/mission-control/memoryAdapter";

export async function POST() {
  const result = await seedFromMemory();
  return NextResponse.json(result);
}
