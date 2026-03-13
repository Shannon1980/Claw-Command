import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const authUser = process.env.AUTH_USER || "";
  const masked = authUser ? authUser[0] + "***" + authUser[authUser.length - 1] : "";

  // Fetch saved gateways from DB
  let gateways: Array<{
    id: string;
    name: string;
    url: string;
    status: string;
    last_check_at: string | null;
    created_at: string;
  }> = [];
  if (pool) {
    try {
      const result = await pool.query(
        `SELECT id, name, url, status, last_check_at, created_at FROM gateways ORDER BY created_at DESC`
      );
      gateways = result.rows;
    } catch {
      // DB may not have gateways table yet
    }
  }

  return NextResponse.json({
    gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || process.env.OPENCLAW_URL || "",
    authUser: masked,
    tokenBudget: process.env.TOKEN_BUDGET_MONTHLY_USD || "",
    alertThreshold: process.env.TOKEN_ALERT_THRESHOLD_PCT || "",
    claudeProjectsDir: process.env.CLAUDE_PROJECTS_DIR || "",
    gateways,
  });
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { name, url } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: "Name and URL are required" },
        { status: 400 }
      );
    }

    const id = `gw-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO gateways (id, name, url, status, created_at)
       VALUES ($1, $2, $3, 'unknown', $4) RETURNING *`,
      [id, name, url, now]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Settings API] POST error:", error);
    return NextResponse.json({ error: "Failed to save gateway" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, name, url } = body;

    if (!id || !url) {
      return NextResponse.json(
        { error: "Gateway ID and URL are required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE gateways SET name = COALESCE($1, name), url = $2, status = 'unknown' WHERE id = $3 RETURNING *`,
      [name, url, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Gateway not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Settings API] PUT error:", error);
    return NextResponse.json({ error: "Failed to update gateway" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Gateway ID is required" }, { status: 400 });
    }

    const result = await pool.query(
      `DELETE FROM gateways WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Gateway not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[Settings API] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete gateway" }, { status: 500 });
  }
}
