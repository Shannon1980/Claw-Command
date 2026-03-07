import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) {
    return NextResponse.json({
      personality: "",
      capabilities: "[]",
      systemPrompt: "",
      constraints: "",
    });
  }

  try {
    const { id } = await params;
    const result = await pool.query(
      `SELECT * FROM agent_souls WHERE agent_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        personality: "",
        capabilities: "[]",
        systemPrompt: "",
        constraints: "",
      });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Agent Soul GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch soul" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  try {
    const { id: agentId } = await params;
    const body = await request.json();
    const { personality, capabilities, systemPrompt, constraints } = body;

    const existing = await pool.query(
      `SELECT id FROM agent_souls WHERE agent_id = $1`,
      [agentId]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE agent_souls
         SET personality = $1, capabilities = $2, system_prompt = $3, constraints = $4, updated_at = NOW()
         WHERE agent_id = $5
         RETURNING *`,
        [personality || "", capabilities || "[]", systemPrompt || "", constraints || "", agentId]
      );
    } else {
      const soulId = `soul-${Date.now()}`;
      result = await pool.query(
        `INSERT INTO agent_souls (id, agent_id, personality, capabilities, system_prompt, constraints, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [soulId, agentId, personality || "", capabilities || "[]", systemPrompt || "", constraints || ""]
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Agent Soul POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upsert soul" },
      { status: 500 }
    );
  }
}
