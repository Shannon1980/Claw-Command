/**
 * Reads MEMORY.md and memory/*.md and populates mcStore.seedData.
 * When DB is available, also inserts into mc_memories.
 */

import fs from "fs";
import path from "path";
import { setMCSeed } from "./mcStore";
import { isMcDbAvailable, dbAddMemory } from "./mcDb";
import type { MemoryItem } from "./mc_types";

export async function seedFromMemory(): Promise<{ memoriesLoaded: number }> {
  const memories: MemoryItem[] = [];
  const now = new Date().toISOString();

  // Try project root (works in Node/Next.js server)
  const projectRoot = process.cwd();
  const memoryPath = path.join(projectRoot, "memory");
  const memoryMdPath = path.join(projectRoot, "MEMORY.md");

  // Read MEMORY.md
  try {
    if (fs.existsSync(memoryMdPath)) {
      const content = fs.readFileSync(memoryMdPath, "utf-8");
      const sections = content.split(/^##\s+/m).filter(Boolean);
      for (const section of sections) {
        const lines = section.split("\n");
        const sectionTitle = lines[0]?.trim() ?? "";
        const tag = sectionTitle.toLowerCase().replace(/\s+/g, "-");
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].replace(/^-\s*/, "").trim();
          if (line) {
            memories.push({
              id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              content: line,
              source: "MEMORY.md",
              tags: [tag],
              createdAt: now,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[memoryAdapter] Could not read MEMORY.md:", err);
  }

  // Read memory/*.md
  try {
    if (fs.existsSync(memoryPath) && fs.statSync(memoryPath).isDirectory()) {
      const files = fs.readdirSync(memoryPath).filter((f) => f.endsWith(".md"));
      for (const file of files) {
        const filePath = path.join(memoryPath, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter((l) => l.trim()).map((l) => l.replace(/^-\s*/, ""));
        for (const line of lines) {
          if (line.trim()) {
            memories.push({
              id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              content: line.trim(),
              source: `memory/${file}`,
              tags: [file.replace(".md", "")],
              createdAt: now,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[memoryAdapter] Could not read memory/*.md:", err);
  }

  setMCSeed({ memories });

  if (isMcDbAvailable() && memories.length > 0) {
    try {
      for (const m of memories) {
        await dbAddMemory({
          content: m.content,
          source: m.source,
          tags: m.tags,
        });
      }
    } catch (err) {
      console.warn("[memoryAdapter] DB insert failed:", err);
    }
  }

  return { memoriesLoaded: memories.length };
}
