import { db } from "./client";
import {
  agents,
  opportunities,
  applications,
  tasks,
  activities,
  alerts,
  skywardWorkstreams,
} from "./schema";

const now = new Date().toISOString();

const AGENTS = [
  { id: "bob", name: "Bob", emoji: "🤖", domain: "vorentoe" },
  { id: "bertha", name: "Bertha", emoji: "💼", domain: "vorentoe" },
  { id: "veronica", name: "Veronica", emoji: "🎯", domain: "vorentoe" },
  { id: "depa", name: "Depa", emoji: "📊", domain: "vorentoe" },
  { id: "forge", name: "Forge", emoji: "⚙️", domain: "vorentoe" },
  { id: "atlas", name: "Atlas", emoji: "🖥️", domain: "vorentoe" },
  { id: "muse", name: "Muse", emoji: "🎨", domain: "vorentoe" },
  { id: "peter", name: "Peter", emoji: "📋", domain: "vorentoe" },
  { id: "harmony", name: "Harmony", emoji: "👥", domain: "community" },
  { id: "skylar", name: "Skylar", emoji: "🌤️", domain: "skyward" },
  { id: "sentinel", name: "Sentinel", emoji: "🛡️", domain: "vorentoe" },
];

export async function seed() {
  if (!db) {
    console.error("Database not configured. Set DATABASE_URL.");
    return;
  }

  console.log("🌱 Seeding Claw Command database...");

  // --- Agents ---
  for (const agent of AGENTS) {
    await db
      .insert(agents)
      .values({
        ...agent,
        status: "idle",
        updatedAt: now,
      })
      .onConflictDoNothing();
  }
  console.log(`  ✅ ${AGENTS.length} agents seeded`);

  // --- Opportunities ---
  const opps = [
    {
      id: "opp-dhs-border",
      title: "DHS Border Technology Modernization",
      stage: "qualify",
      valueUsd: 250000000, // $2.5M in cents
      probability: 40,
      ownerAgentId: "bertha",
      shannonApproval: null,
    },
    {
      id: "opp-va-digital",
      title: "VA Digital Transformation",
      stage: "capture",
      valueUsd: 410000000,
      probability: 60,
      ownerAgentId: "bertha",
      shannonApproval: true,
    },
    {
      id: "opp-navy-cyber",
      title: "Navy Cybersecurity Operations",
      stage: "propose",
      valueUsd: 180000000,
      probability: 75,
      ownerAgentId: "bertha",
      shannonApproval: true,
    },
    {
      id: "opp-disa-cloud",
      title: "DISA Cloud Migration",
      stage: "win",
      valueUsd: 320000000,
      probability: 95,
      ownerAgentId: "bertha",
      shannonApproval: true,
    },
    {
      id: "opp-army-netcom",
      title: "Army NETCOM IT Services",
      stage: "identify",
      valueUsd: 89000000,
      probability: 20,
      ownerAgentId: "depa",
      shannonApproval: null,
    },
  ];

  for (const opp of opps) {
    await db
      .insert(opportunities)
      .values({ ...opp, createdAt: now, updatedAt: now })
      .onConflictDoNothing();
  }
  console.log(`  ✅ ${opps.length} opportunities seeded`);

  // --- Applications ---
  const apps = [
    {
      id: "app-notetaker",
      title: "NoteTaker AI",
      stage: "mvp",
      description: "AI-powered meeting note taker with action item extraction",
      ownerAgentId: "forge",
      shannonApproval: true,
    },
    {
      id: "app-govforecast",
      title: "GovForecast",
      stage: "prototype",
      description: "Government contract opportunity forecasting and analysis",
      ownerAgentId: "forge",
      shannonApproval: true,
    },
    {
      id: "app-busybee",
      title: "BusyBee",
      stage: "concept",
      description: "Productivity tracker for distributed teams",
      ownerAgentId: "atlas",
      shannonApproval: null,
    },
  ];

  for (const app of apps) {
    await db
      .insert(applications)
      .values({
        ...app,
        dependencies: "[]",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }
  console.log(`  ✅ ${apps.length} applications seeded`);

  // --- Tasks ---
  const taskList = [
    {
      id: "task-1",
      title: "Complete 8(a) certification application",
      assignedToAgentId: "veronica",
      dependsOnShannon: true,
      status: "in_progress",
      dueDate: "2026-03-15",
      parentOpportunityId: null,
      parentApplicationId: null,
    },
    {
      id: "task-2",
      title: "Draft DHS Border Tech capability statement",
      assignedToAgentId: "bertha",
      dependsOnShannon: false,
      status: "in_progress",
      dueDate: "2026-03-10",
      parentOpportunityId: "opp-dhs-border",
      parentApplicationId: null,
    },
    {
      id: "task-3",
      title: "Review VA proposal pricing",
      assignedToAgentId: "bertha",
      dependsOnShannon: true,
      status: "blocked",
      dueDate: "2026-03-08",
      parentOpportunityId: "opp-va-digital",
      parentApplicationId: null,
    },
    {
      id: "task-4",
      title: "NoteTaker AI beta testing plan",
      assignedToAgentId: "forge",
      dependsOnShannon: false,
      status: "backlog",
      dueDate: "2026-03-20",
      parentOpportunityId: null,
      parentApplicationId: "app-notetaker",
    },
    {
      id: "task-5",
      title: "Approve MBE certification documents",
      assignedToAgentId: "veronica",
      dependsOnShannon: true,
      status: "blocked",
      dueDate: "2026-03-06",
      parentOpportunityId: null,
      parentApplicationId: null,
    },
    {
      id: "task-6",
      title: "GovForecast data pipeline architecture",
      assignedToAgentId: "forge",
      dependsOnShannon: false,
      status: "in_progress",
      dueDate: "2026-03-12",
      parentOpportunityId: null,
      parentApplicationId: "app-govforecast",
    },
    {
      id: "task-7",
      title: "SEAS IT quarterly status report",
      assignedToAgentId: "skylar",
      dependsOnShannon: true,
      status: "in_progress",
      dueDate: "2026-03-07",
      parentOpportunityId: null,
      parentApplicationId: null,
    },
    {
      id: "task-8",
      title: "PTA spring fundraiser planning",
      assignedToAgentId: "harmony",
      dependsOnShannon: true,
      status: "backlog",
      dueDate: "2026-03-25",
      parentOpportunityId: null,
      parentApplicationId: null,
    },
    {
      id: "task-9",
      title: "Navy Cybersecurity past performance write-up",
      assignedToAgentId: "bertha",
      dependsOnShannon: false,
      status: "in_progress",
      dueDate: "2026-03-11",
      parentOpportunityId: "opp-navy-cyber",
      parentApplicationId: null,
    },
    {
      id: "task-10",
      title: "Brand guidelines v2 for Vorentoe",
      assignedToAgentId: "muse",
      dependsOnShannon: false,
      status: "backlog",
      dueDate: "2026-03-30",
      parentOpportunityId: null,
      parentApplicationId: null,
    },
  ];

  for (const task of taskList) {
    await db
      .insert(tasks)
      .values({ ...task, createdAt: now, updatedAt: now })
      .onConflictDoNothing();
  }
  console.log(`  ✅ ${taskList.length} tasks seeded`);

  // --- Alerts ---
  const alertList = [
    {
      id: "alert-1",
      title: "MBE Certification deadline approaching",
      severity: "critical",
      triggerType: "cert_window_closing",
      resourceId: "task-5",
      dueDate: "2026-03-06",
    },
    {
      id: "alert-2",
      title: "VA proposal pricing review overdue",
      severity: "warning",
      triggerType: "task_overdue",
      resourceId: "task-3",
      dueDate: "2026-03-08",
    },
    {
      id: "alert-3",
      title: "DHS solicitation closing in 72 hours",
      severity: "warning",
      triggerType: "bid_approaching",
      resourceId: "opp-dhs-border",
      dueDate: "2026-03-07",
    },
  ];

  for (const alert of alertList) {
    await db
      .insert(alerts)
      .values({ ...alert, dismissedAt: null, createdAt: now })
      .onConflictDoNothing();
  }
  console.log(`  ✅ ${alertList.length} alerts seeded`);

  // --- Activities ---
  const activityList = [
    {
      id: "act-1",
      actorAgentId: "bertha",
      eventType: "opportunity_staged",
      resourceType: "opportunity",
      resourceId: "opp-va-digital",
      details: JSON.stringify({
        old_state: "qualify",
        new_state: "capture",
        message: "VA Digital moved to capture after initial meeting",
      }),
    },
    {
      id: "act-2",
      actorAgentId: "veronica",
      eventType: "approval_requested",
      resourceType: "task",
      resourceId: "task-5",
      details: JSON.stringify({
        message: "MBE docs ready for Shannon's review",
      }),
    },
    {
      id: "act-3",
      actorAgentId: "forge",
      eventType: "task_started",
      resourceType: "task",
      resourceId: "task-6",
      details: JSON.stringify({
        message: "Starting GovForecast data pipeline architecture",
      }),
    },
    {
      id: "act-4",
      actorAgentId: "skylar",
      eventType: "task_started",
      resourceType: "task",
      resourceId: "task-7",
      details: JSON.stringify({
        message: "Drafting SEAS IT quarterly status report",
      }),
    },
    {
      id: "act-5",
      actorAgentId: null,
      eventType: "alert_fired",
      resourceType: "task",
      resourceId: "task-5",
      details: JSON.stringify({
        message: "System alert: MBE cert deadline in 48 hours",
      }),
    },
  ];

  for (const activity of activityList) {
    await db
      .insert(activities)
      .values({ ...activity, createdAt: now })
      .onConflictDoNothing();
  }
  console.log(`  ✅ ${activityList.length} activities seeded`);

  console.log("🎉 Seed complete!");
}
