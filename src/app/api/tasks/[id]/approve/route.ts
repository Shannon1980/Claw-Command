import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // TODO: Update database when schema PR is merged
  console.log(`[Tasks] Approved task ${id}`);

  return NextResponse.json({
    id,
    action: "approved",
    timestamp: new Date().toISOString(),
    message: `Task ${id} approved by Shannon`,
  });
}
