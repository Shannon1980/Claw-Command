import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  if (!pool) return NextResponse.json([]);

  try {
    const result = await pool.query(
      `SELECT *, POSITION(LOWER($1) IN LOWER(content)) AS relevance
       FROM mc_memories
       WHERE content ILIKE $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [q, `%${q}%`]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Memory Recall API] error:", error);
    return NextResponse.json({ error: "Failed to search memories" }, { status: 500 });
  }
}
