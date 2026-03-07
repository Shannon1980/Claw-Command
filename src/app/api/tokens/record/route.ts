import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { emitTokenUpdate } from "@/lib/events/emitActivity";

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { agentId, sessionId, model, inputTokens, outputTokens, costCents } =
      body;

    if (!model || inputTokens == null || outputTokens == null) {
      return NextResponse.json(
        { error: "model, inputTokens, and outputTokens are required" },
        { status: 400 }
      );
    }

    const id = `tu-${Date.now()}`;
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO token_usage (id, agent_id, session_id, model, input_tokens, output_tokens, cost_cents, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        agentId || null,
        sessionId || null,
        model,
        inputTokens,
        outputTokens,
        costCents ?? 0,
        now,
      ]
    );

    emitTokenUpdate({
      agentId: agentId || undefined,
      model,
      inputTokens,
      outputTokens,
      costCents: costCents ?? 0,
      tokenUsageId: id,
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error("[Tokens Record] Error:", error);
    return NextResponse.json(
      { error: "Failed to record token usage" },
      { status: 500 }
    );
  }
}
