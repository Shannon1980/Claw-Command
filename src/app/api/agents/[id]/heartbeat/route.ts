/**
 * Mission Control path alias: /api/agents/{id}/heartbeat → /api/mc/agents/{id}/heartbeat
 * Use this path when agents expect Mission Control's default API structure.
 */
export { GET, POST } from "@/app/api/mc/agents/[id]/heartbeat/route";
