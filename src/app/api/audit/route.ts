import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);
  schemaReady = true;
}

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json([]);

  try {
    await ensureSchema();
  } catch (err) {
    console.error("[Audit API] Schema error:", err);
    return NextResponse.json([], { status: 200 });
  }

  const searchParams = request.nextUrl.searchParams;
  const user = searchParams.get("user");
  const action = searchParams.get("action");
  const since = searchParams.get("since");
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  try {
    const conds: string[] = [];
    const vals: unknown[] = [];
    let i = 1;

    if (user) {
      conds.push(`(u.username = $${i} OR a.user_id = $${i})`);
      vals.push(user);
      i++;
    }

    if (action) {
      conds.push(`a.action = $${i++}`);
      vals.push(action);
    }

    if (since) {
      conds.push(`a.created_at >= $${i++}`);
      vals.push(since);
    }

    vals.push(limit);
    const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT a.id, a.action, a.resource_type, a.resource_id, a.details, a.created_at, u.username
       FROM audit_events a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${i}`,
      vals
    );

    const rows = result.rows.map((r) => ({
      id: r.id,
      user: r.username ?? r.user_id ?? "",
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      details: typeof r.details === "string" ? r.details : JSON.stringify(r.details ?? {}),
      createdAt: r.created_at,
    }));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[Audit API] GET error:", error);
    return NextResponse.json({ error: "Failed to list audit events" }, { status: 500 });
  }
}
