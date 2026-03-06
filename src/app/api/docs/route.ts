import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

export async function GET(request: NextRequest) {
  if (!pool || !connectionString) {
    return NextResponse.json(
      { docs: [], total: 0, error: "Database not configured" },
      { status: 503 }
    );
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
    const docs = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      filename: row.filename,
      docType: row.doc_type,
      type: row.doc_type, // Frontend compatibility
      content: row.content,
      authorAgentId: row.author_agent_id,
      status: row.status,
      filePath: row.file_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      agent: row.agent_name || "Bob", // Fallback for missing agent join
      agentEmoji: row.agent_emoji || "🤖", // Fallback
    }));
    
    // Return both formats to satisfy different frontend versions
    return NextResponse.json({ docs, total: docs.length });
  } catch (error) {
    console.error("[Docs API] Error:", error);
    return NextResponse.json({ docs: [], total: 0, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool || !connectionString) {
    return NextResponse.json(
      { success: false, error: "Database not configured" },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    const now = new Date().toISOString();
    const id = `doc-${Date.now()}`;

    await pool.query(
      `INSERT INTO docs (id, title, filename, doc_type, content, author_agent_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, body.title, body.filename || `${id}.md`, body.docType || "document", body.content || "", body.authorAgentId || null, "draft", now, now]
    );

    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error("[Docs API] Create error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
