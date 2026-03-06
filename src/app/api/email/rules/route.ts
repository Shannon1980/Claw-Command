import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

function generateId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("account_id");

    let query = `SELECT r.id, r.account_id, r.name, r.enabled, r.actions, r.ai_prompt, r.created_at
                 FROM email_rules r`;
    const values: unknown[] = [];

    if (accountId) {
      query += ` WHERE r.account_id = $1`;
      values.push(accountId);
    }
    query += ` ORDER BY r.created_at DESC`;

    const res = await pool.query(query, values);
    return NextResponse.json(res.rows);
  } catch (err) {
    console.error("[Email API] List rules error:", err);
    return NextResponse.json(
      { error: "Failed to list rules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accountId = body.account_id as string;
    const name = (body.name as string)?.trim();
    const enabled = body.enabled !== false;
    const actions = body.actions ?? [];
    const aiPrompt = (body.ai_prompt as string)?.trim() || null;

    if (!accountId || !name) {
      return NextResponse.json(
        { error: "account_id and name required" },
        { status: 400 }
      );
    }

    const id = generateId();
    const now = new Date().toISOString();
    const actionsJson = JSON.stringify(Array.isArray(actions) ? actions : []);

    await pool.query(
      `INSERT INTO email_rules (id, account_id, name, enabled, actions, ai_prompt, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [id, accountId, name, enabled, actionsJson, aiPrompt, now]
    );

    return NextResponse.json({
      id,
      account_id: accountId,
      name,
      enabled,
      actions: JSON.parse(actionsJson),
      ai_prompt: aiPrompt,
      created_at: now,
    });
  } catch (err) {
    console.error("[Email API] Create rule error:", err);
    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    );
  }
}
