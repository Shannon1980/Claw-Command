import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { emitNotification } from "@/lib/events/emitActivity";
import { seedMemoriesFromFiles } from "@/lib/db/seed-memories";

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mc_memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      source TEXT,
      tags TEXT,
      created_at TEXT NOT NULL
    );
    ALTER TABLE mc_memories ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE mc_memories ADD COLUMN IF NOT EXISTS updated_at TEXT;
  `);
  schemaReady = true;
}

function parseTags(raw: unknown): string[] {
  if (!raw) return [];
  const str = String(raw);
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // not JSON — treat as comma-separated
  }
  return str.split(",").map((t) => t.trim()).filter(Boolean);
}

function mapRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    content: row.content,
    source: row.source || null,
    category: row.category || null,
    tags: parseTags(row.tags),
    createdAt: row.created_at || row.updated_at || new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  try {
    await ensureSchema();

    // Auto-seed from memory/*.md files if the table is empty
    const countResult = await pool.query("SELECT COUNT(*) FROM mc_memories");
    const count = parseInt(countResult.rows[0].count, 10);
    if (count === 0) {
      await seedMemoriesFromFiles(pool);
    }
  } catch (err) {
    console.error("[Memory API] Schema error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to fetch data" }, { status: 500 });
  }

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
    return NextResponse.json(result.rows.map(mapRow));
  } catch (error) {
    console.error("[Memory API] GET error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    await ensureSchema();

    const body = await request.json();
    const { content, source, tags, category } = body;
    const id = `mem-${Date.now()}`;
    const now = new Date().toISOString();

    const tagsValue = Array.isArray(tags) ? JSON.stringify(tags) : tags || null;

    const result = await pool.query(
      `INSERT INTO mc_memories (id, content, source, tags, category, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, content, source || null, tagsValue, category || null, now, now]
    );

    emitNotification({ title: "Memory stored", type: "info" });
    return NextResponse.json(mapRow(result.rows[0]), { status: 201 });
  } catch (error) {
    console.error("[Memory API] POST error:", error);
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
  }
}
