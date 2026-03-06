import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";

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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!pool || !connectionString) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }
  try {
    const result = await pool.query(
      `SELECT id, name, level, authority, status, due_date, applied_date,
              decision_expected, expires_date, description, notes, documents
       FROM certifications WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(rowToCert(result.rows[0]));
  } catch (error) {
    console.error("[Certifications API] Get error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fetch failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!pool || !connectionString) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields: Array<[string, string, unknown]> = [
      ["name", "name", body.name],
      ["level", "level", body.level],
      ["authority", "authority", body.authority],
      ["status", "status", body.status],
      ["due_date", "dueDate", body.dueDate],
      ["applied_date", "appliedDate", body.appliedDate],
      ["decision_expected", "decisionExpected", body.decisionExpected],
      ["expires_date", "expiresDate", body.expiresDate],
      ["description", "description", body.description],
      ["notes", "notes", body.notes],
    ];

    for (const [col, key] of fields) {
      if (body[key] !== undefined) {
        updates.push(`${col} = $${paramIndex}`);
        values.push(body[key] ?? null);
        paramIndex++;
      }
    }

    if (body.documents !== undefined) {
      updates.push(`documents = $${paramIndex}`);
      values.push(
        JSON.stringify(Array.isArray(body.documents) ? body.documents : [])
      );
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;
    values.push(id);

    const result = await pool.query(
      `UPDATE certifications SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING id`,
      values
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const getResult = await pool.query(
      `SELECT id, name, level, authority, status, due_date, applied_date,
              decision_expected, expires_date, description, notes, documents
       FROM certifications WHERE id = $1`,
      [id]
    );
    return NextResponse.json(rowToCert(getResult.rows[0]));
  } catch (error) {
    console.error("[Certifications API] Patch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}
