import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const EXCLUDED_FILES = [
  "MEMORY.md",
  "SOUL.md",
  "USER.md",
  "IDENTITY.md",
  "TOOLS.md",
  "HEARTBEAT.md",
];

function guessAgent(filename: string, content: string): string {
  const fn = filename.toLowerCase();
  const c = (content || "").toLowerCase().slice(0, 500);
  if (fn.includes("cpars") || fn.includes("seas") || fn.includes("skyward"))
    return "skylar";
  if (
    fn.includes("mbe") ||
    fn.includes("cert") ||
    fn.includes("wosb") ||
    fn.includes("lsbrp")
  )
    return "veronica";
  if (
    fn.includes("capability") ||
    fn.includes("brand") ||
    fn.includes("muse")
  )
    return "muse";
  if (
    fn.includes("bd-") ||
    fn.includes("opportunity") ||
    fn.includes("capture") ||
    fn.includes("scout") ||
    fn.includes("competitive")
  )
    return "bertha";
  if (
    fn.includes("safe") ||
    fn.includes("itbiz") ||
    fn.includes("lesson") ||
    fn.includes("teaching")
  )
    return "bob";
  if (
    fn.includes("agent") ||
    fn.includes("subagent") ||
    fn.includes("dashboard") ||
    fn.includes("task")
  )
    return "bob";
  if (
    fn.includes("api-") ||
    fn.includes("component") ||
    fn.includes("implementation") ||
    fn.includes("sam-")
  )
    return "forge";
  if (fn.includes("depa")) return "depa";
  if (
    fn.includes("pta") ||
    fn.includes("community") ||
    fn.includes("courtyard")
  )
    return "harmony";
  return "bob";
}

function guessType(filename: string): string {
  const fn = filename.toLowerCase();
  if (
    fn.includes("capability") ||
    fn.includes("proposal") ||
    fn.includes("rfi") ||
    fn.includes("capture")
  )
    return "proposal";
  if (
    fn.includes("cert") ||
    fn.includes("mbe") ||
    fn.includes("wosb") ||
    fn.includes("lsbrp")
  )
    return "certification_doc";
  if (fn.includes("cpars") || fn.includes("report") || fn.includes("seas"))
    return "report";
  if (
    fn.includes("spec") ||
    fn.includes("api-") ||
    fn.includes("design") ||
    fn.includes("checklist")
  )
    return "reference";
  if (
    fn.includes("safe") ||
    fn.includes("lesson") ||
    fn.includes("teaching")
  )
    return "teaching";
  if (
    fn.includes("agent") ||
    fn.includes("task") ||
    fn.includes("dashboard")
  )
    return "internal";
  return "document";
}

function guessStatus(content: string): string {
  const c = (content || "").toLowerCase().slice(0, 1000);
  if (c.includes("draft") || c.includes("tbd") || c.includes("pending"))
    return "draft";
  if (c.includes("ready for review") || c.includes("in review"))
    return "in_review";
  if (c.includes("approved") || c.includes("complete") || c.includes("final"))
    return "approved";
  return "draft";
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.(md|txt)$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const preview = searchParams.get("preview") === "1";

  const workspacePath =
    process.env.OPENCLAW_WORKSPACE ||
    path.join(os.homedir(), ".openclaw", "workspace");

  if (!fs.existsSync(workspacePath)) {
    return NextResponse.json(
      {
        success: false,
        error: `Workspace not found: ${workspacePath}. Set OPENCLAW_WORKSPACE or run the app locally with ~/.openclaw/workspace.`,
      },
      { status: 404 }
    );
  }

  if (!pool) {
    return NextResponse.json(
      { success: false, error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const files = fs
      .readdirSync(workspacePath)
      .filter(
        (f) =>
          (f.endsWith(".md") || f.endsWith(".txt")) &&
          !EXCLUDED_FILES.includes(f)
      );

    const docs = files.map((f) => {
      const filePath = path.join(workspacePath, f);
      let content = "";
      try {
        content = fs.readFileSync(filePath, "utf8");
      } catch {
        // ignore
      }
      return {
        id: "ws-" + f.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase(),
        title: titleFromFilename(f),
        filename: f,
        docType: guessType(f),
        content: content.slice(0, 50000),
        authorAgentId: guessAgent(f, content),
        status: guessStatus(content),
        filePath,
      };
    });

    if (preview) {
      const incomingIds = new Set(docs.map((d) => d.id));
      const incomingMap = new Map(docs.map((d) => [d.id, d]));
      const created: { id: string; title: string }[] = [];
      const updated: { id: string; title: string }[] = [];
      const deleted: { id: string; title: string }[] = [];
      const res = await pool.query(
        "SELECT id, title, content, status FROM docs WHERE id LIKE 'ws-%'"
      );
      const existingMap = new Map(
        res.rows.map(
          (r: { id: string; title: string; content: string; status: string }) => [
            r.id,
            { title: r.title, content: r.content, status: r.status },
          ]
        )
      );
      const existingIds = new Set(existingMap.keys());
      for (const doc of docs) {
        const ex = existingMap.get(doc.id);
        if (!ex) created.push({ id: doc.id, title: doc.title });
        else if (
          ex.title !== doc.title ||
          ex.content !== doc.content ||
          ex.status !== doc.status
        )
          updated.push({ id: doc.id, title: doc.title });
      }
      for (const id of existingIds) {
        if (!incomingIds.has(id)) {
          const row = res.rows.find((r: { id: string }) => r.id === id);
          deleted.push({ id, title: (row?.title as string) || id });
        }
      }
      return NextResponse.json({
        preview: true,
        created,
        updated,
        deleted,
        workspacePath,
      });
    }

    const client = await pool.connect();
    const now = new Date().toISOString();
    let docsUpserted = 0;

    try {
      await client.query("BEGIN");

      for (const doc of docs) {
        await client.query(
          `INSERT INTO docs (id, title, filename, doc_type, content, author_agent_id, status, file_path, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title,
             content = EXCLUDED.content,
             status = EXCLUDED.status,
             updated_at = EXCLUDED.updated_at`,
          [
            doc.id,
            doc.title,
            doc.filename,
            doc.docType,
            doc.content,
            doc.authorAgentId,
            doc.status,
            doc.filePath,
            now,
            now,
          ]
        );
        docsUpserted++;
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        docsUpserted,
        totalFiles: files.length,
        workspacePath,
        timestamp: now,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[Sync Docs Trigger] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
