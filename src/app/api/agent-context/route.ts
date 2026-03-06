import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { connectionString } from "@/lib/db/config";
import { mockCertifications } from "@/lib/mock-certifications";
import { getActiveAlerts, mockAlerts } from "@/lib/mock-alerts";

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

type Scope = "certifications" | "all";

function formatCertForPrompt(c: {
  name: string;
  level: string;
  authority: string;
  status: string;
  dueDate?: string;
  appliedDate?: string;
  decisionExpected?: string;
  expiresDate?: string;
  documents?: { name: string; completed: boolean }[];
  description?: string;
}) {
  const lines: string[] = [
    `- ${c.name} (${c.level}/${c.authority}): ${c.status}`,
  ];
  if (c.dueDate) lines.push(`  Due: ${c.dueDate}`);
  if (c.appliedDate) lines.push(`  Applied: ${c.appliedDate}`);
  if (c.decisionExpected) lines.push(`  Decision expected: ${c.decisionExpected}`);
  if (c.expiresDate) lines.push(`  Expires: ${c.expiresDate}`);
  if (c.description) lines.push(`  Note: ${c.description}`);
  const docs = c.documents ?? [];
  if (docs.length > 0) {
    const done = docs.filter((d) => d.completed).length;
    lines.push(`  Documents: ${done}/${docs.length} completed`);
  }
  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId") ?? undefined;
  const scope = (searchParams.get("scope") as Scope) || "all";
  const format = searchParams.get("format") || "text"; // text | json

  try {
    let certifications: Array<Record<string, unknown>> = [];
    let alerts: Array<Record<string, unknown>> = [];
    let tasks: Array<Record<string, unknown>> = [];

    if (pool && connectionString) {
      if (scope === "certifications" || scope === "all") {
        const certRes = await pool.query(
          `SELECT id, name, level, authority, status, due_date, applied_date,
                  decision_expected, expires_date, description, notes, documents
           FROM certifications ORDER BY level, name`
        );
        certifications = certRes.rows.map((row) => {
          let documents: { name: string; completed: boolean }[] = [];
          try {
            const parsed = JSON.parse((row.documents as string) || "[]");
            documents = Array.isArray(parsed) ? parsed : [];
          } catch {
            // ignore
          }
          return {
            id: row.id,
            name: row.name,
            level: row.level,
            authority: row.authority,
            status: row.status,
            dueDate: row.due_date,
            appliedDate: row.applied_date,
            decisionExpected: row.decision_expected,
            expiresDate: row.expires_date,
            description: row.description,
            notes: row.notes,
            documents,
          };
        });
      }

      if (scope === "all") {
        const alertRes = await pool.query(
          `SELECT id, title, severity, trigger_type, resource_id, due_date, created_at
           FROM alerts WHERE dismissed_at IS NULL
           ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
                    due_date ASC NULLS LAST`
        );
        alerts = alertRes.rows.map((row) => ({
          id: row.id,
          title: row.title,
          severity: row.severity,
          trigger_type: row.trigger_type,
          due_date: row.due_date,
          resource_id: row.resource_id,
        }));

        const taskConditions = ["status IN ('backlog', 'ready', 'in_progress', 'review', 'blocked')"];
        const taskParams: string[] = [];
        if (agentId) {
          taskConditions.push(`assigned_to_agent_id = $${taskParams.length + 1}`);
          taskParams.push(agentId);
        }
        const taskRes = await pool.query(
          `SELECT id, title, status, due_date, assigned_to_agent_id, depends_on_shannon
           FROM tasks
           WHERE ${taskConditions.join(" AND ")}
           ORDER BY due_date ASC NULLS LAST`,
          taskParams.length > 0 ? taskParams : undefined
        );
        tasks = taskRes.rows.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          due_date: row.due_date,
          assigned_to_agent_id: row.assigned_to_agent_id,
          depends_on_shannon: row.depends_on_shannon,
        }));
      }
    }

    if (certifications.length === 0) {
      certifications = mockCertifications as unknown as Array<Record<string, unknown>>;
    }
    if (alerts.length === 0 && scope === "all") {
      alerts = getActiveAlerts().map((a) => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
        trigger_type: a.trigger_type,
        due_date: a.due_date,
        resource_id: a.id,
      }));
    }
    if (certifications.length === 0) {
      certifications = mockCertifications as unknown as Array<Record<string, unknown>>;
    }

    if (format === "json") {
      return NextResponse.json({
        certifications,
        ...(scope === "all" && { alerts, tasks }),
        agentId: agentId ?? null,
        timestamp: new Date().toISOString(),
      });
    }

    const sections: string[] = [];

    if (certifications.length > 0) {
      sections.push("## Certifications (Vorentoe LLC)\n");
      certifications.forEach((c) => {
        sections.push(formatCertForPrompt(c as Parameters<typeof formatCertForPrompt>[0]));
        sections.push("");
      });
    }

    if (scope === "all" && alerts.length > 0) {
      sections.push("## Active Alerts\n");
      alerts.forEach((a) => {
        sections.push(
          `- [${a.severity}] ${a.title}${a.due_date ? ` (due ${a.due_date})` : ""}`
        );
      });
      sections.push("");
    }

    if (scope === "all" && tasks.length > 0) {
      sections.push(agentId ? "## Your Assigned Tasks\n" : "## Active Tasks\n");
      tasks.forEach((t) => {
        const due = t.due_date ? ` (due ${t.due_date})` : "";
        const shannon = t.depends_on_shannon ? " [needs Shannon approval]" : "";
        sections.push(`- [${t.status}] ${t.title}${due}${shannon}`);
      });
    }

    const text = sections.join("\n").trim() || "No context available.";
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("[Agent Context] Error:", error);
    // Fallback to mock data when DB fails
    const certs = mockCertifications;
    const alertList = getActiveAlerts();
    if (format === "json") {
      return NextResponse.json({
        certifications: certs,
        alerts: scope === "all" ? alertList : undefined,
        tasks: scope === "all" ? [] : undefined,
        agentId: agentId ?? null,
        timestamp: new Date().toISOString(),
      });
    }
    const sections: string[] = ["## Certifications (Vorentoe LLC)\n"];
    certs.forEach((c) => {
      sections.push(formatCertForPrompt(c));
      sections.push("");
    });
    if (scope === "all" && alertList.length > 0) {
      sections.push("## Active Alerts\n");
      alertList.forEach((a) => {
        sections.push(`- [${a.severity}] ${a.title}${a.due_date ? ` (due ${a.due_date})` : ""}`);
      });
    }
    return new NextResponse(sections.join("\n").trim(), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
