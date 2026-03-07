import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  const format = request.nextUrl.searchParams.get("format") || "json";

  try {
    const result = await pool.query(`SELECT * FROM tasks ORDER BY created_at DESC`);

    if (format === "csv") {
      if (result.rows.length === 0) {
        return new NextResponse("", {
          headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=tasks.csv" },
        });
      }
      const headers = Object.keys(result.rows[0]);
      const csvLines = [headers.join(",")];
      for (const row of result.rows) {
        const values = headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        });
        csvLines.push(values.join(","));
      }
      return new NextResponse(csvLines.join("\n"), {
        headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=tasks.csv" },
      });
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[Export Tasks] error:", error);
    return NextResponse.json({ error: "Failed to export tasks" }, { status: 500 });
  }
}
