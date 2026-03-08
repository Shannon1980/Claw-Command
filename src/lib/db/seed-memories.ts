import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { mcMemories } from "./schema";
import type { Database } from "./client";

export interface SeedMemory {
  id: string;
  content: string;
  source: string;
  tags: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Parse all memory/seed-*.md files and return structured memory objects.
 * Each bullet point becomes a separate memory entry.
 */
export function parseSeedMemories(): SeedMemory[] {
  const memoryDir = path.join(process.cwd(), "memory");
  if (!fs.existsSync(memoryDir)) return [];

  const files = fs
    .readdirSync(memoryDir)
    .filter((f) => f.startsWith("seed-") && f.endsWith(".md"))
    .sort();

  const now = new Date().toISOString();
  const memories: SeedMemory[] = [];

  for (const file of files) {
    const stem = file.replace(/\.md$/, ""); // e.g. "seed-tasks"
    const tag = stem.replace(/^seed-/, ""); // e.g. "tasks"
    const content = fs.readFileSync(path.join(memoryDir, file), "utf-8");
    const lines = content.split("\n");

    // Extract heading as category
    const headingLine = lines.find((l) => l.startsWith("# "));
    const category = headingLine ? headingLine.replace(/^#\s+/, "").trim() : tag;

    // Extract bullet points
    let bulletIndex = 0;
    for (const line of lines) {
      const match = line.match(/^-\s+(.+)/);
      if (match) {
        memories.push({
          id: `${stem}-${bulletIndex}`,
          content: match[1].trim(),
          source: "seed",
          tags: JSON.stringify([tag]),
          category,
          createdAt: now,
          updatedAt: now,
        });
        bulletIndex++;
      }
    }
  }

  return memories;
}

/**
 * Insert seed memories into the database using raw SQL (ON CONFLICT DO NOTHING).
 * Returns the number of memories parsed (inserts are idempotent).
 */
export async function seedMemoriesFromFiles(dbPool: Pool): Promise<number> {
  const memories = parseSeedMemories();
  for (const mem of memories) {
    await dbPool.query(
      `INSERT INTO mc_memories (id, content, source, tags, category, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [mem.id, mem.content, mem.source, mem.tags, mem.category, mem.createdAt, mem.updatedAt]
    );
  }
  return memories.length;
}

/**
 * Insert seed memories using Drizzle ORM with onConflictDoNothing().
 * Returns the number of memories parsed.
 */
export async function seedMemoriesWithDrizzle(db: Database): Promise<number> {
  const memories = parseSeedMemories();
  for (const mem of memories) {
    await db
      .insert(mcMemories)
      .values(mem)
      .onConflictDoNothing();
  }
  return memories.length;
}
