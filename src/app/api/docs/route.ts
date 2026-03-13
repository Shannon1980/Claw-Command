import { pool } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";
import type { Document, LinkedItem } from "@/lib/mock-docs";
import fs from "fs";
import path from "path";
import os from "os";

let schemaReady = false;

// ─── Agent metadata for workspace docs ────────────────────────────────────

const AGENT_META: Record<string, { name: string; emoji: string }> = {
  bob: { name: "Bob", emoji: "\u{1F916}" },
  bertha: { name: "Bertha", emoji: "\u{1F4BC}" },
  veronica: { name: "Veronica", emoji: "\u{1F3AF}" },
  depa: { name: "Depa", emoji: "\u{1F4CA}" },
  forge: { name: "Forge", emoji: "\u{2699}\u{FE0F}" },
  atlas: { name: "Atlas", emoji: "\u{1F5A5}\u{FE0F}" },
  muse: { name: "Muse", emoji: "\u{1F3A8}" },
  peter: { name: "Peter", emoji: "\u{1F4CB}" },
  harmony: { name: "Harmony", emoji: "\u{1F465}" },
  skylar: { name: "Skylar", emoji: "\u{1F324}\u{FE0F}" },
  sentinel: { name: "Sentinel", emoji: "\u{1F6E1}\u{FE0F}" },
};

// ─── Workspace file reading (mirrors sync/docs/trigger logic) ─────────────

const EXCLUDED_FILES = ["MEMORY.md", "SOUL.md", "USER.md", "IDENTITY.md", "TOOLS.md", "HEARTBEAT.md"];

// Repo documentation files that should NOT appear as business documents
const EXCLUDED_REPO_FILES = [
  "README.md", "readme.md", "Readme.md",
  "CONTRIBUTING.md", "contributing.md",
  "LICENSE.md", "license.md", "LICENSE",
  "CHANGELOG.md", "changelog.md", "CHANGES.md",
  "CODE_OF_CONDUCT.md", "SECURITY.md",
  "PULL_REQUEST_TEMPLATE.md", "ISSUE_TEMPLATE.md",
  "TODO.md", "ROADMAP.md", "ARCHITECTURE.md",
  "INSTALL.md", "SETUP.md", "DEVELOPMENT.md",
  "DEPLOY.md", "MIGRATION.md",
  ".gitignore", ".eslintrc", ".prettierrc",
  "package.json", "tsconfig.json",
];

// Filename patterns that indicate repo/technical docs rather than business docs
const REPO_DOC_PATTERNS = [
  /^api-/i,              // API documentation
  /^component/i,         // Component docs
  /^implementation/i,    // Implementation notes
  /^spec-/i,             // Technical specifications
  /^design-/i,           // Technical design docs
  /^checklist-/i,        // Dev checklists
  /^agent-/i,            // Agent system configs
  /^subagent-/i,         // Subagent definitions
  /^dashboard-/i,        // Dashboard configs
  /^task-/i,             // Task system definitions
  /^sam-/i,              // SAM system docs
  /^\./, // Hidden/dot files
];

function isRepoDoc(filename: string): boolean {
  if (EXCLUDED_REPO_FILES.includes(filename)) return true;
  return REPO_DOC_PATTERNS.some((pattern) => pattern.test(filename));
}

function guessAgent(filename: string, content: string): string {
  const fn = filename.toLowerCase();
  if (fn.includes("cpars") || fn.includes("seas") || fn.includes("skyward")) return "skylar";
  if (fn.includes("mbe") || fn.includes("cert") || fn.includes("wosb") || fn.includes("lsbrp")) return "veronica";
  if (fn.includes("capability") || fn.includes("brand") || fn.includes("muse")) return "muse";
  if (fn.includes("bd-") || fn.includes("opportunity") || fn.includes("capture") || fn.includes("scout") || fn.includes("competitive")) return "bertha";
  if (fn.includes("depa")) return "depa";
  if (fn.includes("pta") || fn.includes("community") || fn.includes("courtyard")) return "harmony";
  return "bob";
}

function guessType(filename: string): string {
  const fn = filename.toLowerCase();
  if (fn.includes("capability") || fn.includes("proposal") || fn.includes("rfi") || fn.includes("capture")) return "proposal";
  if (fn.includes("cert") || fn.includes("mbe") || fn.includes("wosb") || fn.includes("lsbrp")) return "certification_doc";
  if (fn.includes("cpars") || fn.includes("report") || fn.includes("seas")) return "report";
  if (fn.includes("template")) return "template";
  return "report";
}

function guessStatus(content: string): string {
  const c = (content || "").toLowerCase().slice(0, 1000);
  if (c.includes("draft") || c.includes("tbd") || c.includes("pending")) return "draft";
  if (c.includes("ready for review") || c.includes("in review")) return "in_review";
  if (c.includes("approved") || c.includes("complete") || c.includes("final")) return "approved";
  return "draft";
}

function guessCategory(filename: string, content: string): string {
  const fn = filename.toLowerCase();
  const c = (content || "").toLowerCase().slice(0, 1000);
  if (fn.includes("cert") || fn.includes("mbe") || fn.includes("wosb") || fn.includes("cpars") || c.includes("compliance")) return "compliance";
  if (fn.includes("capability") || fn.includes("proposal") || fn.includes("capture") || fn.includes("bd-") || c.includes("govcon")) return "govcon";
  if (fn.includes("api-") || fn.includes("spec") || fn.includes("design") || c.includes("technical")) return "technical";
  if (fn.includes("agent") || fn.includes("dashboard") || fn.includes("task")) return "internal";
  return "uncategorized";
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

function getWorkspacePath(): string {
  return process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), ".openclaw", "workspace");
}

function readWorkspaceDocs(): Document[] {
  const workspacePath = getWorkspacePath();
  if (!fs.existsSync(workspacePath)) return [];

  try {
    const files = fs.readdirSync(workspacePath).filter(
      (f) =>
        (f.endsWith(".md") || f.endsWith(".txt")) &&
        !EXCLUDED_FILES.includes(f) &&
        !isRepoDoc(f)
    );

    const now = new Date().toISOString();
    return files.map((f) => {
      const filePath = path.join(workspacePath, f);
      let content = "";
      let stat: fs.Stats | null = null;
      try {
        content = fs.readFileSync(filePath, "utf8");
        stat = fs.statSync(filePath);
      } catch { /* ignore */ }

      const agentId = guessAgent(f, content);
      const meta = AGENT_META[agentId] || AGENT_META.bob;

      return {
        id: "ws-" + f.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase(),
        title: titleFromFilename(f),
        type: guessType(f) as Document["type"],
        content: content.slice(0, 50000),
        status: guessStatus(content) as Document["status"],
        agent: meta.name,
        agentEmoji: meta.emoji,
        linkedTo: [],
        versionHistory: [{ timestamp: stat?.mtime?.toISOString() || now, summary: "Synced from workspace" }],
        priority: "medium",
        reviewStatus: "pending_review",
        category: guessCategory(f, content) as Document["category"],
        notes: [],
        assignments: [],
        createdAt: stat?.birthtime?.toISOString() || now,
        updatedAt: stat?.mtime?.toISOString() || now,
      };
    });
  } catch {
    return [];
  }
}

/** Non-database fallback: workspace documents only */
function getFallbackDocs(): Document[] {
  return readWorkspaceDocs();
}

async function ensureSchema() {
  if (schemaReady || !pool) return;
  const createTable =
    "CREATE TABLE IF NOT EXISTS docs (" +
    "id TEXT PRIMARY KEY, title TEXT NOT NULL, filename TEXT, doc_type TEXT NOT NULL DEFAULT 'report', " +
    "content TEXT DEFAULT '', author_agent_id TEXT, status TEXT NOT NULL DEFAULT 'draft', file_path TEXT, " +
    "linked_to JSONB DEFAULT '[]'::jsonb, version_history JSONB DEFAULT '[]'::jsonb, " +
    "priority TEXT DEFAULT 'medium', review_status TEXT DEFAULT 'pending_review', category TEXT DEFAULT 'uncategorized', " +
    "notes JSONB DEFAULT '[]'::jsonb, assignments JSONB DEFAULT '[]'::jsonb, " +
    "created_at TEXT NOT NULL DEFAULT (now()::text), updated_at TEXT NOT NULL DEFAULT (now()::text));";
  await pool.query(createTable);
  const alterTable =
    "DO $$ BEGIN " +
    "ALTER TABLE docs ADD COLUMN IF NOT EXISTS linked_to JSONB DEFAULT '[]'::jsonb; " +
    "ALTER TABLE docs ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]'::jsonb; " +
    "EXCEPTION WHEN others THEN NULL; END $$;";
  try {
    await pool.query(alterTable);
  } catch {
    /* ignore */
  }
  schemaReady = true;
}

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json(getFallbackDocs());

  try {
    await ensureSchema();
  } catch {
    return NextResponse.json(getFallbackDocs());
  }

  const { searchParams } = new URL(request.url);
  const docType = searchParams.get("type");
  const search = searchParams.get("search");

  try {
    // Use minimal columns to avoid schema drift (linked_to, etc. may not exist)
    const baseQuery =
      "SELECT d.id, d.title, d.filename, d.doc_type, d.content, d.author_agent_id, " +
      "d.status, d.file_path, d.created_at, d.updated_at " +
      "FROM docs d";
    let query = baseQuery;
    const conditions: string[] = [];
    const params: string[] = [];

    if (docType) {
      params.push(docType);
      conditions.push("d.doc_type = $" + params.length);
    }
    if (search) {
      params.push("%" + search + "%");
      conditions.push("(d.title ILIKE $" + params.length + " OR d.content ILIKE $" + params.length + ")");
    }
    // Skip linkedType, reviewStatus, category, priority filters - those columns may not exist in deployed schema

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY d.updated_at DESC";

    const result = await pool.query(query, params);
    const docs = result.rows.map((row: Record<string, unknown>) => {
      const agentId = (row.author_agent_id as string) || "bob";
      const meta = AGENT_META[agentId] || AGENT_META.bob;
      return {
        id: row.id,
        title: row.title,
        filename: row.filename,
        type: row.doc_type,
        content: row.content || "",
        authorAgentId: row.author_agent_id,
        status: row.status,
        filePath: row.file_path,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        agent: meta.name,
        agentEmoji: meta.emoji,
        linkedTo: [] as LinkedItem[],
        versionHistory: [{ timestamp: row.updated_at as string, summary: "Synced" }],
        priority: "medium",
        reviewStatus: "pending_review",
        category: "uncategorized",
        notes: [],
        assignments: [],
      };
    });

    return NextResponse.json(docs);
  } catch (error) {
    console.error("[Docs API] Error:", error);
    return NextResponse.json(getFallbackDocs());
  }
}

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "No database connection" }, { status: 503 });
  }

  try {
    await ensureSchema();
    const body = await request.json();
    const now = new Date().toISOString();
    const id = "doc-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);

    const linkedTo = Array.isArray(body.linkedTo) ? body.linkedTo : [];
    const versionHistory = [{ timestamp: now, summary: "Document created" }];
    const priority = body.priority || "medium";
    const category = body.category || "uncategorized";

    await pool.query(
      "INSERT INTO docs (id, title, filename, doc_type, content, author_agent_id, status, " +
        "linked_to, version_history, priority, review_status, category, notes, assignments, " +
        "created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, 'draft', " +
        "$7::jsonb, $8::jsonb, $9, 'pending_review', $10, '[]'::jsonb, '[]'::jsonb, $11, $11)",
      [
        id,
        body.title,
        body.filename || id + ".md",
        body.type || body.docType || "report",
        body.content || "",
        body.authorAgentId || null,
        JSON.stringify(linkedTo),
        JSON.stringify(versionHistory),
        priority,
        category,
        now,
      ]
    );

    return NextResponse.json({
      id,
      title: body.title,
      type: body.type || body.docType || "report",
      content: body.content || "",
      status: "draft",
      agent: body.agent || "Unknown",
      agentEmoji: body.agentEmoji || "",
      linkedTo,
      versionHistory,
      priority,
      reviewStatus: "pending_review",
      category,
      notes: [],
      assignments: [],
      createdAt: now,
      updatedAt: now,
    }, { status: 201 });
  } catch (error) {
    console.error("[Docs API] Create error:", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
