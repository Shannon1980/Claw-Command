import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";


function rowToEvent(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    domain: row.domain,
    startTime: row.start_time,
    endTime: row.end_time,
    protected: Boolean(row.protected),
    description: row.description ?? undefined,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  if (!pool) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    let query = `SELECT id, title, domain, start_time, end_time, protected, description
                 FROM calendar_events`;
    const params: string[] = [];

    if (startParam && endParam) {
      query += ` WHERE start_time < $2 AND end_time > $1`;
      params.push(startParam, endParam);
    }

    query += ` ORDER BY start_time ASC`;

    const result = await pool.query(query, params.length > 0 ? params : undefined);

    const events = result.rows.map((row) => {
      const e = rowToEvent(row);
      return {
        ...e,
        startTime: new Date(e.startTime as string),
        endTime: new Date(e.endTime as string),
      };
    });
    return NextResponse.json(events);
  } catch (error) {
    console.error("[Calendar Events API] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    const title = (body.title as string)?.trim();
    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    const id = `evt-${Date.now()}`;
    const now = new Date().toISOString();
    const startTime = body.startTime ?? body.start_time ?? now;
    const endTime = body.endTime ?? body.end_time ?? now;
    const domain = body.domain || "vorentoe";
    const protected_ = Boolean(body.protected);
    const description = body.description ?? null;

    await pool.query(
      `INSERT INTO calendar_events (id, title, domain, start_time, end_time, protected, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      [id, title, domain, startTime, endTime, protected_, description, now]
    );

    return NextResponse.json({
      id,
      success: true,
      startTime,
      endTime,
    });
  } catch (error) {
    console.error("[Calendar Events API] Create error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Create failed",
      },
      { status: 500 }
    );
  }
}
