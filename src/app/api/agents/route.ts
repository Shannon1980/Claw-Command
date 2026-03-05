import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getSortedAgents } from "@/lib/mock-chat";
import { connectionString } from "@/lib/db/config";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  try {
    if (connectionString) {
      const result = await pool.query(
        "SELECT id, name, emoji, domain, status, current_task_id, updated_at FROM agents ORDER BY domain, name"
      );
      if (result.rows.length > 0) {
        return NextResponse.json(result.rows);
      }
    }
    // Fallback to mock agents when DB is empty or unavailable
    const mockAgents = getSortedAgents().map((a) => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      domain: "vorentoe",
      status: a.status,
      current_task_id: null,
      updated_at: a.lastActivity?.toISOString() ?? new Date().toISOString(),
    }));
    return NextResponse.json(mockAgents);
  } catch (error) {
    console.error("[Agents API] Error:", error);
    // Fallback to mock agents on DB error
    const mockAgents = getSortedAgents().map((a) => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      domain: "vorentoe",
      status: a.status,
      current_task_id: null,
      updated_at: a.lastActivity?.toISOString() ?? new Date().toISOString(),
    }));
    return NextResponse.json(mockAgents);
  }
}
