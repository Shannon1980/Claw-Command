import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await context.params;

  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const result = await pool.query(
      `SELECT tu.id, tu.agent_id, tu.session_id, tu.model,
              tu.input_tokens, tu.output_tokens, tu.cost_cents, tu.created_at,
              a.name as agent_name, a.emoji as agent_emoji
       FROM token_usage tu
       LEFT JOIN agents a ON tu.agent_id = a.id
       WHERE tu.session_id = $1
       ORDER BY tu.created_at ASC`,
      [sessionId]
    );

    return NextResponse.json({
      session_id: sessionId,
      records: result.rows,
    });
  } catch (error) {
    console.error("[Session Detail API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
