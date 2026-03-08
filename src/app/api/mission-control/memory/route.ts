import { pool } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { seedMemoriesFromFiles } from "@/lib/db/seed-memories";

async function ensureSchema() {
  if (!pool) return;
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

export async function GET() {
  if (!pool) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    await ensureSchema();

    // Auto-seed from memory/*.md files if the table is empty
    const countResult = await pool.query("SELECT COUNT(*) FROM mc_memories");
    const count = parseInt(countResult.rows[0].count, 10);
    if (count === 0) {
      await seedMemoriesFromFiles(pool);
    }

    const result = await pool.query(
      "SELECT * FROM mc_memories ORDER BY created_at DESC"
    );
    return NextResponse.json(result.rows.map(mapRow));
  } catch (error) {
    console.error("[Mission Control Memory] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch memories" },
      { status: 500 }
    );
  }
}
