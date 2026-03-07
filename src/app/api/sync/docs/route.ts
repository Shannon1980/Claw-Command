import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

interface DocPush {
  id: string;
  title: string;
  filename: string;
  docType: string;
  content: string;
  authorAgentId: string | null;
  status: string;
  filePath: string | null;
}

export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });

  try {
    const body: { docs: DocPush[] } = await request.json();

    if (!body.docs || !Array.isArray(body.docs)) {
      return NextResponse.json({ error: "docs array required" }, { status: 400 });
    }

    const client = await pool.connect();
    const now = new Date().toISOString();
    let docsUpserted = 0;

    try {
      await client.query("BEGIN");

      for (const doc of body.docs) {
        await client.query(
          `INSERT INTO docs (id, title, filename, doc_type, content, author_agent_id, status, file_path, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title,
             content = EXCLUDED.content,
             status = EXCLUDED.status,
             updated_at = EXCLUDED.updated_at`,
          [doc.id, doc.title, doc.filename, doc.docType, doc.content, doc.authorAgentId, doc.status, doc.filePath, now, now]
        );
        docsUpserted++;
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        docsUpserted,
        timestamp: now,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[Sync Docs] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
