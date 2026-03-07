import { NextResponse } from "next/server";
import { SKYWARD_PROFILE } from "@/lib/opportunity-engine/skyward-profile";

export async function GET() {
  return NextResponse.json({
    partner: SKYWARD_PROFILE,
    teamingStatus: "verbal_agreement",
    teamingNotes:
      "Skyward prime, Vorentoe sub. Formalize when opportunity surfaces.",
  });
}
