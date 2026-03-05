<<<<<<< feature/docs-manager
import { NextResponse } from "next/server";
import { mockDocuments, Document } from "@/lib/mock-docs";

export async function GET() {
  return NextResponse.json(mockDocuments);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: body.title || "Untitled Document",
      type: body.type || "template",
      agent: body.agent || "Bob",
      agentEmoji: body.agentEmoji || "🤖",
      status: "draft",
      content: body.content || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // In a real app, this would save to a database
    mockDocuments.push(newDoc);

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create document" },
=======
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(request: NextRequest) {
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
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Docs API] Error:", error);
    return NextResponse.json([], { status: 500 });
  }
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
>>>>>>> main
      { status: 500 }
    );
  }
}
