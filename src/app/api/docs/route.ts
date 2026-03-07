import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

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
      linked_to JSONB DEFAULT '[]'::jsonb,
      version_history JSONB DEFAULT '[]'::jsonb,
      priority TEXT DEFAULT 'medium',
      review_status TEXT DEFAULT 'pending_review',
      category TEXT DEFAULT 'uncategorized',
      notes JSONB DEFAULT '[]'::jsonb,
      assignments JSONB DEFAULT '[]'::jsonb,
      created_at TEXT NOT NULL DEFAULT (now()::text),
      updated_at TEXT NOT NULL DEFAULT (now()::text)
    );
  `);
  // Add linked_to column if it doesn't exist (for existing tables)
  await pool.query(`
    ALTER TABLE docs ADD COLUMN IF NOT EXISTS linked_to TEXT DEFAULT '[]';
  // Add columns if they don't exist (migration for existing tables)
  await pool.query(
    "DO " + "$$" + " BEGIN" +
    " ALTER TABLE docs ADD COLUMN IF NOT EXISTS linked_to JSONB DEFAULT '[]'::jsonb;" +
    " ALTER TABLE docs ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]'::jsonb;" +
    " EXCEPTION WHEN others THEN NULL;" +
    " END " + "$$" + ";"
  );
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
  const linkedType = searchParams.get("linkedType");
  const linkedId = searchParams.get("linkedId");
  const reviewStatus = searchParams.get("reviewStatus");
  const category = searchParams.get("category");
  const priority = searchParams.get("priority");

  try {
    let query = `
      SELECT d.id, d.title, d.filename, d.doc_type, d.content, d.author_agent_id,
             d.status, d.file_path, d.linked_to, d.version_history,
             d.priority, d.review_status, d.category, d.notes, d.assignments,
             d.created_at, d.updated_at,
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
    if (linkedType && linkedId) {
      params.push(linkedType);
      params.push(linkedId);
      conditions.push(`d.linked_to @> jsonb_build_array(jsonb_build_object('type', $${params.length - 1}::text, 'id', $${params.length}::text))`);
    }
    if (reviewStatus) {
      params.push(reviewStatus);
      conditions.push(`d.review_status = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`d.category = $${params.length}`);
    }
    if (priority) {
      params.push(priority);
      conditions.push(`d.priority = $${params.length}`);
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
      linkedTo: row.linked_to || [],
      versionHistory: row.version_history || [],
      priority: row.priority || "medium",
      reviewStatus: row.review_status || "pending_review",
      category: row.category || "uncategorized",
      notes: row.notes || [],
      assignments: row.assignments || [],
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

    const linkedTo = Array.isArray(body.linkedTo) ? body.linkedTo : [];
    const versionHistory = [{ timestamp: now, summary: "Document created" }];
    const priority = body.priority || "medium";
    const category = body.category || "uncategorized";

    await pool.query(
      `INSERT INTO docs (id, title, filename, doc_type, content, author_agent_id, status,
        linked_to, version_history, priority, review_status, category, notes, assignments,
        created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft',
        $7::jsonb, $8::jsonb, $9, 'pending_review', $10, '[]'::jsonb, '[]'::jsonb,
        $11, $11)`,
      [
        id,
        body.title,
        body.filename || `${id}.md`,
        body.type || body.docType || "report",
        body.content || "",
        body.authorAgentId || null,
        JSON.stringify(linkedTo),
        JSON.stringify(versionHistory),
        priority,
        category,
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
      linkedTo,
      versionHistory,
      priority,
      reviewStatus: "pending_review",
      category,
      notes: [],
      assignments: [],
      createdAt: now,
      updatedAt: now,
    }, { status: 201 });
  } catch (error) {
    console.error("[Docs API] Create error:", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
