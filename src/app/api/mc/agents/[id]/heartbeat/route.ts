import { NextRequest } from "next/server";
import { requireMcAuth } from "@/lib/mc/auth";
import {
  POST as heartbeatPost,
  GET as heartbeatGet,
} from "@/app/api/agents/[id]/heartbeat/route";

/**
 * Mission Control–compatible agent heartbeat.
 * Delegates to the canonical /api/agents/[id]/heartbeat route after MC auth check.
 * Always includes pending_tasks for MC compatibility.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireMcAuth(request);
  if (authError) return authError;

  // MC heartbeats always want pending tasks back
  const url = new URL(request.url);
  url.searchParams.set("pending_tasks", "true");
  const patchedRequest = new NextRequest(url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return heartbeatPost(patchedRequest, { params: context.params });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireMcAuth(request);
  if (authError) return authError;

  return heartbeatGet(request, { params: context.params });
}
