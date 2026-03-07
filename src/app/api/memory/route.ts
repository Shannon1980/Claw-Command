import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { emitNotification } from "@/lib/events/emitActivity";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json([]);

  const searchParams = request.nextUrl.searchParams;
  const tags = searchParams.get("tags") || searchParams.get("tag");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const category = searchParams.get("category");
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  try {
    const conds: string[] = [];
    const vals: unknown[] = [];
    let i = 1;

    if (source) {
      conds.push(`source = $${i++}`);
      vals.push(source);
    }

    if (category) {
      conds.push(`category = $${i++}`);
      vals.push(category);
    }

    if (search) {
      conds.push(`content ILIKE $${i++}`);
      vals.push(`%${search}%`);
    }

    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim());
      const tagConds = tagList.map((tag) => {
        vals.push(`%${tag}%`);
        return `tags::text ILIKE $${i++}`;
      });
      conds.push(`(${tagConds.join(" OR ")})`);
    }

    vals.push(limit);
    const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT * FROM mc_memories ${where} ORDER BY created_at DESC LIMIT $${i}`,
      vals
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Memory API] GET error:", error);
    return NextResponse.json({ error: "Failed to list memories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { content, source, tags, category } = body;
    const id = `mem-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO mc_memories (id, content, source, tags, category, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, content, source || null, tags || null, category || null, now, now]
    );

    emitNotification({ title: "Memory stored", type: "info" });
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[Memory API] POST error:", error);
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
  }
}
