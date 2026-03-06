import { NextResponse } from "next/server";
import { getMCStore } from "@/lib/mission-control/mcStore";

export async function GET() {
  // Agents come from shared agents table; MC store has seed for now
  const store = getMCStore();
  return NextResponse.json(store.agents);
}
