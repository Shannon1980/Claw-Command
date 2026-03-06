import { NextResponse } from "next/server";
import { seedAllMC } from "@/lib/mission-control/seedAll";

export async function POST() {
  const result = await seedAllMC();
  return NextResponse.json(result);
}
