import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { mockDocuments } from "@/lib/mock-docs";
import { connectionString } from "@/lib/db/config";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

function mapDbRowToDocument(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    type: row.doc_type || "report",
    agent: row.agent_name || "Unknown",
    agentEmoji: row.agent_emoji || "📄",
    status: row.status || "draft",
    content: row.content || "",
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const docType = searchParams.get("type");
  const search = searchParams.get("search");

  try {
    if (connectionString) {
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
      if (result.rows.length > 0) {
        const docs = result.rows.map((row) => mapDbRowToDocument(row));
        return NextResponse.json(docs);
      }
    }
  } catch (error) {
    console.error("[Docs API] Error:", error);
  }

  // Fallback to mock documents when DB unavailable or empty
  let docs = [...mockDocuments];
  if (docType) {
    docs = docs.filter((d) => d.type === docType);
  }
  if (search) {
    const q = search.toLowerCase();
    docs = docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
    );
  }
  return NextResponse.json(docs);
}

export async function POST(request: NextRequest) {
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
