import { NextRequest, NextResponse } from "next/server";

// Mock agent data — swap to DB query when schema PR is merged
const AGENTS = [
  { id: "bob", name: "Bob", emoji: "🤖", domain: "vorentoe", status: "active", currentTask: "Orchestrating Claw Command build" },
  { id: "bertha", name: "Bertha", emoji: "💼", domain: "vorentoe", status: "active", currentTask: "DHS Border Tech capability statement" },
  { id: "veronica", name: "Veronica", emoji: "🎯", domain: "vorentoe", status: "waiting_for_shannon", currentTask: "MBE certification — awaiting approval" },
  { id: "depa", name: "Depa", emoji: "📊", domain: "vorentoe", status: "active", currentTask: "Army NETCOM competitive analysis" },
  { id: "forge", name: "Forge", emoji: "⚙️", domain: "vorentoe", status: "active", currentTask: "GovForecast data pipeline" },
  { id: "atlas", name: "Atlas", emoji: "🖥️", domain: "vorentoe", status: "idle", currentTask: null },
  { id: "muse", name: "Muse", emoji: "🎨", domain: "vorentoe", status: "idle", currentTask: null },
  { id: "peter", name: "Peter", emoji: "📋", domain: "vorentoe", status: "active", currentTask: "Sprint planning Week 2" },
  { id: "harmony", name: "Harmony", emoji: "👥", domain: "community", status: "idle", currentTask: null },
  { id: "skylar", name: "Skylar", emoji: "🌤️", domain: "skyward", status: "active", currentTask: "SEAS IT quarterly report" },
  { id: "sentinel", name: "Sentinel", emoji: "🛡️", domain: "vorentoe", status: "idle", currentTask: null },
];

export async function GET() {
  return NextResponse.json(AGENTS);
}
