import {
  CertificationsApiResponse,
  Certification,
  isCertLevel,
  isCertStatus,
} from "@/lib/certifications/model";
import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS certifications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'Federal',
      authority TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      due_date TEXT,
      applied_date TEXT,
      decision_expected TEXT,
      expires_date TEXT,
      description TEXT,
      notes TEXT,
      documents TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT NOW()::TEXT,
      updated_at TEXT NOT NULL DEFAULT NOW()::TEXT
    )
  `);
  schemaReady = true;
}

function rowToCert(row: Record<string, unknown>): Certification {
  const documents = (() => {
    try {
      const parsed = JSON.parse((row.documents as string) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  return {
    id: typeof row.id === "string" ? row.id : "",
    name: typeof row.name === "string" ? row.name : "",
    level: isCertLevel(row.level) ? row.level : "Federal",
    authority: typeof row.authority === "string" ? row.authority : "",
    status: isCertStatus(row.status) ? row.status : "NOT_STARTED",
    dueDate: typeof row.due_date === "string" ? row.due_date : undefined,
    appliedDate:
      typeof row.applied_date === "string" ? row.applied_date : undefined,
    decisionExpected:
      typeof row.decision_expected === "string"
        ? row.decision_expected
        : undefined,
    expiresDate:
      typeof row.expires_date === "string" ? row.expires_date : undefined,
    description:
      typeof row.description === "string" ? row.description : undefined,
    notes: typeof row.notes === "string" ? row.notes : undefined,
    documents,
  };
}

export async function GET() {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  try {
    await ensureSchema();
    const result = await pool.query(
      `SELECT id, name, level, authority, status, due_date, applied_date,
              decision_expected, expires_date, description, notes, documents
       FROM certifications ORDER BY level, name`
    );

    const response: CertificationsApiResponse = {
      data: result.rows.map(rowToCert),
      meta: {
        lastUpdated: new Date().toISOString(),
        source: "database",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Certifications API] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    await ensureSchema();
    const body = await request.json();
    const id = (body.id as string)?.trim() || `cert-${Date.now()}`;
    const name = (body.name as string)?.trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const level = isCertLevel(body.level) ? body.level : "Federal";
    const status = isCertStatus(body.status) ? body.status : "NOT_STARTED";
    const authority = typeof body.authority === "string" ? body.authority : "";
    const documents = JSON.stringify(
      Array.isArray(body.documents) ? body.documents : []
    );
    const result = await pool.query(
      `INSERT INTO certifications (id, name, level, authority, status, due_date, applied_date,
        decision_expected, expires_date, description, notes, documents, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
       RETURNING id, name, level, authority, status, due_date, applied_date,
                 decision_expected, expires_date, description, notes, documents`,
      [
        id,
        name,
        level,
        authority,
        status,
        body.dueDate ?? null,
        body.appliedDate ?? null,
        body.decisionExpected ?? null,
        body.expiresDate ?? null,
        body.description ?? null,
        body.notes ?? null,
        documents,
        now,
      ]
    );

    return NextResponse.json(rowToCert(result.rows[0]));
  } catch (error) {
    console.error("[Certifications API] Create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 500 }
    );
  }
}
