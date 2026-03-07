import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { emitNotification } from "@/lib/events/emitActivity";

export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json([]);
  }

  try {
    const limit = Number(request.nextUrl.searchParams.get("limit")) || 50;
    const result = await pool.query(
      `SELECT * FROM notifications ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Notifications GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { title, body: notifBody, type, resourceUrl } = body;

    const id = `notif-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO notifications (id, title, body, type, resource_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, title, notifBody || null, type || "info", resourceUrl || null, now]
    );

    emitNotification({ title, body: notifBody, type, resourceUrl, id });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Notifications POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create notification" },
      { status: 500 }
    );
  }
}
