import { NextRequest, NextResponse } from "next/server";
import {
  listSkills,
  createSkill,
  isGatewayOnline,
} from "@/lib/openclaw/client";

export async function GET() {
  const online = await isGatewayOnline();
  if (!online) {
    return NextResponse.json(
      { error: "OpenClaw gateway offline", skills: [] },
      { status: 503 }
    );
  }

  const skills = await listSkills();
  return NextResponse.json(skills);
}

export async function POST(request: NextRequest) {
  const online = await isGatewayOnline();
  if (!online) {
    return NextResponse.json(
      { error: "OpenClaw gateway offline" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const name = (body.name as string)?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const skill = await createSkill({
      name,
      description: body.description || undefined,
      enabled: body.enabled ?? true,
      category: body.category || undefined,
      node_ids: body.node_ids || undefined,
      config: body.config || undefined,
    });

    if (!skill) {
      return NextResponse.json(
        { error: "Failed to create skill" },
        { status: 500 }
      );
    }

    return NextResponse.json(skill, { status: 201 });
  } catch (error) {
    console.error("[Skills API] Create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 500 }
    );
  }
}
