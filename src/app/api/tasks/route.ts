import { NextRequest, NextResponse } from "next/server";

// Mock task data — swap to DB query when schema PR is merged
const TASKS = [
  { id: "task-1", title: "Complete 8(a) certification application", assignedToAgentId: "veronica", dependsOnShannon: true, status: "in_progress", dueDate: "2026-03-15" },
  { id: "task-2", title: "Draft DHS Border Tech capability statement", assignedToAgentId: "bertha", dependsOnShannon: false, status: "in_progress", dueDate: "2026-03-10" },
  { id: "task-3", title: "Review VA proposal pricing", assignedToAgentId: "bertha", dependsOnShannon: true, status: "blocked", dueDate: "2026-03-08" },
  { id: "task-4", title: "NoteTaker AI beta testing plan", assignedToAgentId: "forge", dependsOnShannon: false, status: "backlog", dueDate: "2026-03-20" },
  { id: "task-5", title: "Approve MBE certification documents", assignedToAgentId: "veronica", dependsOnShannon: true, status: "blocked", dueDate: "2026-03-06" },
  { id: "task-6", title: "GovForecast data pipeline architecture", assignedToAgentId: "forge", dependsOnShannon: false, status: "in_progress", dueDate: "2026-03-12" },
  { id: "task-7", title: "SEAS IT quarterly status report", assignedToAgentId: "skylar", dependsOnShannon: true, status: "in_progress", dueDate: "2026-03-07" },
  { id: "task-8", title: "PTA spring fundraiser planning", assignedToAgentId: "harmony", dependsOnShannon: true, status: "backlog", dueDate: "2026-03-25" },
  { id: "task-9", title: "Navy Cybersecurity past performance", assignedToAgentId: "bertha", dependsOnShannon: false, status: "in_progress", dueDate: "2026-03-11" },
  { id: "task-10", title: "Brand guidelines v2 for Vorentoe", assignedToAgentId: "muse", dependsOnShannon: false, status: "backlog", dueDate: "2026-03-30" },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dependsOnShannon = searchParams.get("depends_on_shannon");

  let filtered = TASKS;
  if (dependsOnShannon === "true") {
    filtered = TASKS.filter((t) => t.dependsOnShannon);
  }

  return NextResponse.json(filtered);
}
