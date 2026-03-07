import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS docs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      filename TEXT,
      doc_type TEXT NOT NULL DEFAULT 'report',
      content TEXT DEFAULT '',
      author_agent_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      file_path TEXT,
      created_at TEXT NOT NULL DEFAULT (now()::text),
      updated_at TEXT NOT NULL DEFAULT (now()::text)
    );
  `);
  schemaReady = true;
}

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json([]);

  try {
    await ensureSchema();
  } catch {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const docType = searchParams.get("type");
  const search = searchParams.get("search");

  try {
    let query = `
      SELECT d.id, d.title, d.filename, d.doc_type, d.content, d.author_agent_id,
             d.status, d.file_path, d.created_at, d.updated_at,
             a.name as agent_name, a.emoji as agent_emoji
      FROM docs d
      LEFT JOIN agents a ON d.author_agent_id = a.id
    `;
    const conditions: string[] = [];
    const params: string[] = [];

    if (docType) {
      params.push(docType);
      conditions.push(`d.doc_type = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(d.title ILIKE $${params.length} OR d.content ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY d.updated_at DESC";

    const result = await pool.query(query, params);
    const docs = result.rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      title: row.title,
      filename: row.filename,
      type: row.doc_type,
      content: row.content || "",
      authorAgentId: row.author_agent_id,
      status: row.status,
      filePath: row.file_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      agent: (row.agent_name as string) || "Unknown",
      agentEmoji: (row.agent_emoji as string) || "",
    }));

    return NextResponse.json(docs);
  } catch (error) {
    console.error("[Docs API] Error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    await ensureSchema();
    const body = await request.json();
    const now = new Date().toISOString();
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    await pool.query(
      `INSERT INTO docs (id, title, filename, doc_type, content, author_agent_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $7)`,
      [
        id,
        body.title,
        body.filename || `${id}.md`,
        body.type || body.docType || "report",
        body.content || "",
        body.authorAgentId || null,
        now,
      ]
    );

    return NextResponse.json({
      id,
      title: body.title,
      type: body.type || body.docType || "report",
      content: body.content || "",
      status: "draft",
      agent: body.agent || "Unknown",
      agentEmoji: body.agentEmoji || "",
      createdAt: now,
      updatedAt: now,
    }, { status: 201 });
  } catch (error) {
    console.error("[Docs API] Create error:", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
