import { pool } from "@/lib/db/client";
import { NextResponse } from "next/server";


let schemaReady = false;

async function ensureSchema() {
  if (schemaReady || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS skyward_workstreams (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT NOT NULL DEFAULT 'on_track',
      owner_agent_id TEXT,
      key_dates TEXT NOT NULL DEFAULT '[]',
      description TEXT DEFAULT '',
      risk_factors TEXT DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (now()::text)
    );
    ALTER TABLE skyward_workstreams ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE skyward_workstreams ADD COLUMN IF NOT EXISTS owner_agent_id TEXT;
    ALTER TABLE skyward_workstreams ADD COLUMN IF NOT EXISTS key_dates TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE skyward_workstreams ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
    ALTER TABLE skyward_workstreams ADD COLUMN IF NOT EXISTS risk_factors TEXT DEFAULT '[]';
    ALTER TABLE skyward_workstreams ADD COLUMN IF NOT EXISTS updated_at TEXT;
  `);
  schemaReady = true;
}

const SKYWARD_AGENT_IDS = ["skylar", "depa"];
const SKYWARD_KEYWORDS = ["SEAS", "Skyward", "CPARS", "CMS", "portal", "recompete"];

function taskMatchesWorkstream(taskTitle: string, workstreamName: string): boolean {
  const t = taskTitle.toLowerCase();
  const w = workstreamName.toLowerCase();
  if (w.includes("infrastructure") && (t.includes("seas") || t.includes("admin") || t.includes("migration")))
    return true;
  if (w.includes("portal") && (t.includes("portal") || t.includes("cms")))
    return true;
  if (w.includes("security") && (t.includes("security") || t.includes("compliance") || t.includes("cpars")))
    return true;
  if (w.includes("analytics") && (t.includes("analytics") || t.includes("data")))
    return true;
  if (w.includes("recompete") && (t.includes("recompete") || t.includes("competitor")))
    return true;
  if (t.includes("cpars") && w.includes("security")) return true;
  if (t.includes("seas") && w.includes("infrastructure")) return true;
  return false;
}

function isSkywardNote(content: string): boolean {
  const c = content.toLowerCase();
  return SKYWARD_KEYWORDS.some((k) => c.includes(k.toLowerCase()));
}

export async function GET() {
  if (!pool) {
    return NextResponse.json(
      { error: "Database not configured. Set DATABASE_URL or POSTGRES_URL." },
      { status: 503 }
    );
  }

  try {
    await ensureSchema();
    const now = new Date().toISOString();

    // 1. Workstreams from DB (fallback to seed if empty)
    let workstreamsRes = await pool.query(
      `SELECT w.id, w.name, w.status, w.key_dates, w.description, w.risk_factors, w.updated_at,
              a.name as owner_name, a.emoji as owner_emoji
       FROM skyward_workstreams w
       LEFT JOIN agents a ON w.owner_agent_id = a.id
       ORDER BY w.name NULLS LAST`
    );

    if (workstreamsRes.rows.length === 0) {
      await seedWorkstreams(pool);
      workstreamsRes = await pool.query(
        `SELECT w.id, w.name, w.status, w.key_dates, w.description, w.risk_factors, w.updated_at,
                a.name as owner_name, a.emoji as owner_emoji
         FROM skyward_workstreams w
         LEFT JOIN agents a ON w.owner_agent_id = a.id
         ORDER BY w.name NULLS LAST`
      );
    }

    // 2. Skyward tasks (assigned to Skylar or Depa, or title contains Skyward/SEAS)
    const tasksRes = await pool.query(
      `SELECT t.id, t.title, t.status, t.due_date, t.depends_on_shannon,
              a.name as agent_name, a.emoji as agent_emoji
       FROM tasks t
       LEFT JOIN agents a ON t.assigned_to_agent_id = a.id
       WHERE (a.domain = 'skyward' OR t.title ILIKE '%SEAS%' OR t.title ILIKE '%Skyward%' OR t.title ILIKE '%CPARS%')
       AND t.status IN ('backlog', 'ready', 'in_progress', 'review', 'blocked')
       ORDER BY t.due_date ASC NULLS LAST`
    );

    const tasks = tasksRes.rows as Array<{
      id: string;
      title: string;
      status: string;
      due_date: string | null;
      depends_on_shannon: boolean;
      agent_name: string;
      agent_emoji: string;
    }>;

    // 3. Action items for Shannon (depends_on_shannon + Skyward)
    const actionItemsForShannon = tasks.filter((t) => t.depends_on_shannon);

    // 4. Key updates: user messages to Bob that mention SEAS/Skyward (notes posted daily)
    let keyUpdates: Array<{ id: string; content: string; timestamp: string }> = [];
    try {
      const chatRes = await pool.query(
        `SELECT id, content, created_at
         FROM chat_messages
         WHERE agent_id = 'bob' AND sender = 'user'
         ORDER BY created_at DESC
         LIMIT 50`
      );
      for (const row of chatRes.rows as Array<{ id: string; content: string; created_at: string }>) {
        if (isSkywardNote(row.content)) {
          keyUpdates.push({
            id: row.id,
            content: row.content,
            timestamp: row.created_at,
          });
        }
      }
    } catch {
      /* chat_messages may not exist */
    }

    // 5. Also include recent Skyward activities as key updates
    const activitiesRes = await pool.query(
      `SELECT a.id, a.details, a.created_at, ag.name as agent_name
       FROM activities a
       LEFT JOIN agents ag ON a.actor_agent_id = ag.id
       WHERE (ag.domain = 'skyward' OR a.details ILIKE '%SEAS%' OR a.details ILIKE '%Skyward%')
       ORDER BY a.created_at DESC
       LIMIT 10`
    );

    for (const row of activitiesRes.rows as Array<{ id: string; details: string; created_at: string; agent_name: string }>) {
      try {
        const d = JSON.parse(row.details || "{}");
        const msg = d.message || d.description || row.details?.slice(0, 200);
        if (msg && isSkywardNote(msg)) {
          keyUpdates.push({
            id: `act-${row.id}`,
            content: `[${row.agent_name || "System"}] ${msg}`,
            timestamp: row.created_at,
          });
        }
      } catch {
        /* ignore */
      }
    }

    keyUpdates = keyUpdates
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    // 6. Attach tasks to workstreams
    const workstreams = workstreamsRes.rows.map((w: Record<string, unknown>) => {
      let keyDates: Array<{ milestone: string; date: string; completed: boolean }> = [];
      try {
        keyDates = JSON.parse((w.key_dates as string) || "[]");
      } catch {
        /* ignore */
      }
      const milestones = keyDates.map((k, i) => ({
        id: `m-${w.id}-${i}`,
        name: k.milestone,
        date: k.date,
        completed: k.completed,
      }));
      let riskFactors: string[] = [];
      try {
        riskFactors = JSON.parse((w.risk_factors as string) || "[]");
      } catch {
        /* ignore */
      }
      const wsTasks = tasks.filter((t) =>
        taskMatchesWorkstream(t.title, w.name as string)
      );
      return {
        id: w.id,
        name: w.name,
        status: w.status,
        description: (w.description as string) || "",
        owner: `${w.owner_emoji || ""} ${w.owner_name || "Skylar"}`.trim(),
        milestones,
        riskFactors,
        tasks: wsTasks,
        updatedAt: w.updated_at,
      };
    });

    // Tasks not matched to any workstream go to "Other"
    const matchedTaskIds = new Set(workstreams.flatMap((w) => (w.tasks as typeof tasks).map((t) => t.id)));
    const otherTasks = tasks.filter((t) => !matchedTaskIds.has(t.id));
    if (otherTasks.length > 0) {
      workstreams.push({
        id: "other",
        name: "Other Skyward",
        status: "on_track",
        description: "Tasks not yet assigned to a workstream",
        owner: "Skylar 🌤️",
        milestones: [],
        riskFactors: [],
        tasks: otherTasks,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      workstreams,
      actionItemsForShannon,
      keyUpdates,
      timestamp: now,
    });
  } catch (error) {
    console.error("[Skyward API] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch Skyward data";
    return NextResponse.json(
      {
        error: message,
        hint:
          "Ensure DATABASE_URL is set in Vercel and the DB has run migrations. Run /api/seed to populate agents/workstreams.",
      },
      { status: 500 }
    );
  }
}

async function seedWorkstreams(p: NonNullable<typeof pool>) {
  const now = new Date().toISOString();

  // Ensure skylar agent exists (FK for owner_agent_id)
  await p.query(
    `INSERT INTO agents (id, name, emoji, domain, status, current_task_id, updated_at)
     VALUES ('skylar', 'Skylar', '🌤️', 'skyward', 'idle', null, $1)
     ON CONFLICT (id) DO NOTHING`,
    [now]
  );

  const workstreams = [
    {
      id: "ws1",
      name: "SEAS IT Infrastructure Migration",
      status: "on_track",
      key_dates: JSON.stringify([
        { milestone: "Architecture Design", date: "2025-12-15", completed: true },
        { milestone: "Phase 2 Migration", date: "2026-03-31", completed: false },
        { milestone: "Final Cutover", date: "2026-04-15", completed: false },
      ]),
      description: "Migrating legacy infrastructure to cloud-native architecture.",
      risk_factors: "[]",
    },
    {
      id: "ws2",
      name: "CMS Portal Modernization",
      status: "at_risk",
      key_dates: JSON.stringify([
        { milestone: "Backend API Development", date: "2026-02-28", completed: false },
        { milestone: "UAT & Launch", date: "2026-04-30", completed: false },
      ]),
      description: "Updating the CMS customer portal with modern UI/UX.",
      risk_factors: JSON.stringify(["Resource constraints", "Scope creep"]),
    },
    {
      id: "ws3",
      name: "Security Compliance Audit",
      status: "on_track",
      key_dates: JSON.stringify([
        { milestone: "Remediation Execution", date: "2026-03-15", completed: false },
        { milestone: "Final Report", date: "2026-03-31", completed: false },
      ]),
      description: "Annual security compliance review for FedRAMP Moderate baseline.",
      risk_factors: "[]",
    },
    {
      id: "ws4",
      name: "Data Analytics Platform",
      status: "blocked",
      key_dates: JSON.stringify([
        { milestone: "Vendor Selection", date: "2026-03-01", completed: false },
        { milestone: "Platform Setup", date: "2026-04-30", completed: false },
      ]),
      description: "Enterprise analytics platform for CMS program data.",
      risk_factors: JSON.stringify(["Vendor proposals delayed", "Budget approval pending"]),
    },
    {
      id: "ws5",
      name: "Skyward Recompete Strategy",
      status: "on_track",
      key_dates: JSON.stringify([
        { milestone: "Finalize Competitor List", date: "2026-03-14", completed: false },
      ]),
      description: "Recompete strategy and competitor analysis.",
      risk_factors: "[]",
    },
  ];

  for (const w of workstreams) {
    await p.query(
      `INSERT INTO skyward_workstreams (id, name, status, owner_agent_id, key_dates, description, risk_factors, updated_at)
       VALUES ($1, $2, $3, 'skylar', $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         status = EXCLUDED.status,
         key_dates = EXCLUDED.key_dates,
         description = EXCLUDED.description,
         risk_factors = EXCLUDED.risk_factors,
         updated_at = EXCLUDED.updated_at`,
      [w.id, w.name, w.status, w.key_dates, w.description, w.risk_factors, now]
    );
  }
}
