import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import { emitNotification } from "@/lib/events/emitActivity";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const result = await pool.query(`SELECT * FROM cron_jobs WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Cron job not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Cron API] GET by id error:", error);
    return NextResponse.json({ error: "Failed to get cron job" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const key of ["name", "schedule", "action", "enabled", "last_run_at", "next_run_at", "run_count"]) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      let val = body[key] ?? body[camelKey];
      if (val !== undefined) {
        if (key === "action" && typeof val === "object") {
          val = JSON.stringify(val ?? {});
        }
        fields.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await pool.query(
      `UPDATE cron_jobs SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Cron job not found" }, { status: 404 });
    }
    emitNotification({ title: "Cron job updated", type: "info" });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[Cron API] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update cron job" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    const result = await pool.query(
      `DELETE FROM cron_jobs WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Cron job not found" }, { status: 404 });
    }
    emitNotification({ title: "Cron job deleted", type: "info" });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[Cron API] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete cron job" }, { status: 500 });
  }
}
