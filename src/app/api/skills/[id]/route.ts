import { NextRequest, NextResponse } from "next/server";
import {
  getSkill,
  updateSkill,
  deleteSkill,
  isGatewayOnline,
} from "@/lib/openclaw/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const online = await isGatewayOnline();
  if (!online) {
    return NextResponse.json(
      { error: "OpenClaw gateway offline" },
      { status: 503 }
    );
  }

  const skill = await getSkill(id);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }
  return NextResponse.json(skill);
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const online = await isGatewayOnline();
  if (!online) {
    return NextResponse.json(
      { error: "OpenClaw gateway offline" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const skill = await updateSkill(id, {
      name: body.name,
      description: body.description,
      enabled: body.enabled,
      category: body.category,
      node_ids: body.node_ids,
      config: body.config,
    });

    if (!skill) {
      return NextResponse.json(
        { error: "Failed to update skill" },
        { status: 500 }
      );
    }
    return NextResponse.json(skill);
  } catch (error) {
    console.error("[Skills API] Update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const online = await isGatewayOnline();
  if (!online) {
    return NextResponse.json(
      { error: "OpenClaw gateway offline" },
      { status: 503 }
    );
  }

  const ok = await deleteSkill(id);
  if (!ok) {
    return NextResponse.json(
      { error: "Failed to delete skill" },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
