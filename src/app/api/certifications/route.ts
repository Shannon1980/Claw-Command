import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { mockCertifications } from "@/lib/mock-certifications";

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

function rowToCert(row: Record<string, unknown>) {
  const documents = (() => {
    try {
      const parsed = JSON.parse((row.documents as string) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    authority: row.authority,
    status: row.status,
    dueDate: row.due_date ?? undefined,
    appliedDate: row.applied_date ?? undefined,
    decisionExpected: row.decision_expected ?? undefined,
    expiresDate: row.expires_date ?? undefined,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    documents,
  };
}

export async function GET() {
  try {
    if (pool && connectionString) {
      const result = await pool.query(
        `SELECT id, name, level, authority, status, due_date, applied_date,
                decision_expected, expires_date, description, notes, documents
         FROM certifications ORDER BY level, name`
      );
      if (result.rows.length > 0) {
        return NextResponse.json(result.rows.map(rowToCert));
      }
    }
  } catch (error) {
    console.error("[Certifications API] Error:", error);
  }
  return NextResponse.json(mockCertifications);
}

export async function POST(request: NextRequest) {
  if (!pool || !connectionString) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    const id = (body.id as string)?.trim() || `cert-${Date.now()}`;
    const name = (body.name as string)?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    const now = new Date().toISOString();
    const documents = JSON.stringify(
      Array.isArray(body.documents) ? body.documents : []
    );
    await pool.query(
      `INSERT INTO certifications (id, name, level, authority, status, due_date, applied_date,
        decision_expected, expires_date, description, notes, documents, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)`,
      [
        id,
        name,
        body.level || "Federal",
        body.authority || "",
        body.status || "NOT_STARTED",
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
    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error("[Certifications API] Create error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Create failed",
      },
      { status: 500 }
    );
  }
}
