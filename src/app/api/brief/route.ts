import { pool } from "@/lib/db/client";
import { NextResponse } from "next/server";

interface OvernightSummary {
  tasksCompleted: number;
  newAlerts: number;
  pendingApprovals: number;
}

interface DomainStatus {
  name: string;
  icon: string;
  activeTasks: number;
  blockers: string[];
  keyUpdates: string[];
}

interface Priority {
  id: string;
  title: string;
  domain: string;
  urgency: "critical" | "high" | "medium";
  dueDate?: string;
}


const DOMAIN_CONFIG: Record<string, { name: string; icon: string }> = {
  vorentoe: { name: "Vorentoe", icon: "💼" },
  skyward: { name: "Skyward", icon: "🌤️" },
  community: { name: "Community", icon: "👥" },
  teaching: { name: "Teaching", icon: "📚" },
};

const OVERNIGHT_HOURS = 24;

function getOvernightCutoff(): string {
  const d = new Date();
  d.setHours(d.getHours() - OVERNIGHT_HOURS);
  return d.toISOString();
}

export async function GET(request: Request) {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const domainFilter = searchParams.get("domain"); // e.g. "skyward"

  try {
    const cutoff = getOvernightCutoff();

    // 1. Overnight summary
    const [tasksCompletedRes, newAlertsRes, pendingApprovalsRes] =
      await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int as count FROM activities 
           WHERE event_type = 'task_completed' AND created_at >= $1`,
          [cutoff]
        ),
        pool.query(
          `SELECT COUNT(*)::int as count FROM alerts 
           WHERE dismissed_at IS NULL AND created_at >= $1`,
          [cutoff]
        ),
        pool.query(
          `SELECT COUNT(*)::int as count FROM tasks 
           WHERE depends_on_shannon = true 
           AND status IN ('backlog', 'ready', 'in_progress', 'review', 'blocked')`
        ),
      ]);

    const summary: OvernightSummary = {
      tasksCompleted: tasksCompletedRes.rows[0]?.count ?? 0,
      newAlerts: newAlertsRes.rows[0]?.count ?? 0,
      pendingApprovals: pendingApprovalsRes.rows[0]?.count ?? 0,
    };

    // 2. Tasks with agents for domain grouping
    const tasksRes = await pool.query(
      `SELECT t.id, t.title, t.status, t.due_date, t.assigned_to_agent_id,
              a.domain
       FROM tasks t
       LEFT JOIN agents a ON t.assigned_to_agent_id = a.id
       WHERE t.status IN ('backlog', 'ready', 'in_progress', 'review', 'blocked')`
    );

    const tasks = tasksRes.rows as Array<{
      id: string;
      title: string;
      status: string;
      due_date: string | null;
      assigned_to_agent_id: string;
      domain: string | null;
    }>;

    // 3. Domain statuses
    const domainMap = new Map<
      string,
      { activeTasks: number; blockers: string[]; keyUpdates: string[] }
    >();

    for (const [key, config] of Object.entries(DOMAIN_CONFIG)) {
      domainMap.set(key, {
        activeTasks: 0,
        blockers: [],
        keyUpdates: [],
      });
    }

    const now = new Date();
    for (const task of tasks) {
      const domain = (task.domain || "vorentoe").toLowerCase();
      const entry = domainMap.get(domain) ?? domainMap.get("vorentoe");
      if (!entry) continue;

      entry.activeTasks++;

      if (task.status === "blocked") {
        entry.blockers.push(task.title);
      }

      if (task.due_date) {
        const due = new Date(task.due_date);
        const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursLeft < 72 && hoursLeft > 0) {
          entry.keyUpdates.push(`${task.title} (due ${task.due_date})`);
        }
      }
    }

    let domains: DomainStatus[] = Object.entries(DOMAIN_CONFIG).map(
      ([key, config]) => {
        const entry = domainMap.get(key) ?? {
          activeTasks: 0,
          blockers: [] as string[],
          keyUpdates: [] as string[],
        };
        return {
          name: config.name,
          icon: config.icon,
          activeTasks: entry.activeTasks,
          blockers: entry.blockers.slice(0, 5),
          keyUpdates: entry.keyUpdates.slice(0, 5),
        };
      }
    );
    if (domainFilter) {
      const d = domainFilter.toLowerCase();
      domains = domains.filter(
        (x) => x.name.toLowerCase() === d || x.name.toLowerCase().includes(d)
      );
    }

    // 4. Priorities (tasks needing attention, ordered by urgency)
    const prioritiesRes = await pool.query(
      `SELECT t.id, t.title, t.due_date, t.depends_on_shannon,
              a.domain
       FROM tasks t
       LEFT JOIN agents a ON t.assigned_to_agent_id = a.id
       WHERE t.status IN ('backlog', 'ready', 'in_progress', 'review', 'blocked')
       AND t.due_date IS NOT NULL
       ORDER BY t.due_date ASC
       LIMIT 10`
    );

    let priorities: Priority[] = (prioritiesRes.rows as Array<{
      id: string;
      title: string;
      due_date: string | null;
      depends_on_shannon: boolean;
      domain: string | null;
    }>).map((row) => {
      const domainName =
        DOMAIN_CONFIG[(row.domain || "vorentoe").toLowerCase()]?.name ??
        "Vorentoe";
      const due = row.due_date ? new Date(row.due_date) : null;
      const hoursLeft = due
        ? (due.getTime() - now.getTime()) / (1000 * 60 * 60)
        : Infinity;

      let urgency: "critical" | "high" | "medium" = "medium";
      if (hoursLeft < 0) urgency = "critical";
      else if (hoursLeft < 72 || row.depends_on_shannon) urgency = "high";

      return {
        id: row.id,
        title: row.title,
        domain: domainName,
        urgency,
        dueDate: row.due_date ?? undefined,
      };
    });
    if (domainFilter) {
      const d = domainFilter.toLowerCase();
      priorities = priorities.filter(
        (p) =>
          p.domain.toLowerCase() === d || p.domain.toLowerCase().includes(d)
      );
    }

    return NextResponse.json({
      summary,
      domains,
      priorities,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Brief API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Brief fetch failed" },
      { status: 500 }
    );
  }
}
