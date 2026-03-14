import {
  Certification,
  isCertLevel,
  isCertStatus,
} from "@/lib/certifications/model";
import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

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
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
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
    appliedDate: typeof row.applied_date === "string" ? row.applied_date : undefined,
    decisionExpected: typeof row.decision_expected === "string" ? row.decision_expected : undefined,
    expiresDate: typeof row.expires_date === "string" ? row.expires_date : undefined,
    description: typeof row.description === "string" ? row.description : undefined,
    notes: typeof row.notes === "string" ? row.notes : undefined,
    documents,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!pool) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
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
  if (!pool) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields: Array<[string, string]> = [
      ["name", "name"],
      ["level", "level"],
      ["authority", "authority"],
      ["status", "status"],
      ["due_date", "dueDate"],
      ["applied_date", "appliedDate"],
      ["decision_expected", "decisionExpected"],
      ["expires_date", "expiresDate"],
      ["description", "description"],
      ["notes", "notes"],
    ];

    for (const [col, key] of fields) {
      if (body[key] === undefined) continue;

      if (key === "level" && !isCertLevel(body[key])) {
        return NextResponse.json({ error: "Invalid level" }, { status: 400 });
      }

      if (key === "status" && !isCertStatus(body[key])) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      updates.push(`${col} = $${paramIndex}`);
      values.push(body[key] ?? null);
      paramIndex++;
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
      `UPDATE certifications SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(rowToCert(result.rows[0]));
  } catch (error) {
    console.error("[Certifications API] Patch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!pool) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const result = await pool.query(
      `DELETE FROM certifications WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[Certifications API] Delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
