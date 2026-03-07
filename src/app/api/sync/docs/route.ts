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

type SyncPreview = {
  preview: true;
  created: { id: string; title: string }[];
  updated: { id: string; title: string }[];
  deleted: { id: string; title: string }[];
};

async function computeSyncPreview(docs: DocPush[]): Promise<SyncPreview> {
  const incomingIds = new Set(docs.map((d) => d.id));
  const incomingMap = new Map(docs.map((d) => [d.id, d]));
  const created: { id: string; title: string }[] = [];
  const updated: { id: string; title: string }[] = [];
  const deleted: { id: string; title: string }[] = [];

  const result = await pool!.query(
    "SELECT id, title, content, status FROM docs WHERE id LIKE 'ws-%'"
  );
  const existingMap = new Map(
    result.rows.map((r: { id: string; title: string; content: string; status: string }) => [
      r.id,
      { title: r.title, content: r.content, status: r.status },
    ])
  );
  const existingIds = new Set(existingMap.keys());

  for (const doc of docs) {
    const ex = existingMap.get(doc.id);
    if (!ex) created.push({ id: doc.id, title: doc.title });
    else if (
      ex.title !== doc.title ||
      ex.content !== doc.content ||
      ex.status !== doc.status
    ) {
      updated.push({ id: doc.id, title: doc.title });
    }
  }
  for (const id of existingIds) {
    if (!incomingIds.has(id)) {
      const row = result.rows.find((r: { id: string }) => r.id === id);
      deleted.push({ id, title: (row?.title as string) || id });
    }
  }

  return { preview: true, created, updated, deleted };
}

export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });

  try {
    const body: { docs: DocPush[]; preview?: boolean; deleteIds?: string[] } = await request.json();

    if (!body.docs || !Array.isArray(body.docs)) {
      return NextResponse.json({ error: "docs array required" }, { status: 400 });
    }

    if (body.preview) {
      const preview = await computeSyncPreview(body.docs);
      return NextResponse.json(preview);
    }

    const deleteIds: string[] = Array.isArray(body.deleteIds) ? body.deleteIds : [];

    const client = await pool.connect();
    const now = new Date().toISOString();
    let docsUpserted = 0;
    let docsDeleted = 0;

    try {
      await client.query("BEGIN");

      for (const id of deleteIds) {
        await client.query("DELETE FROM docs WHERE id = $1 AND id LIKE 'ws-%'", [id]);
        docsDeleted++;
      }

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
        docsDeleted,
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
