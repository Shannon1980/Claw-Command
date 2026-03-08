/**
 * Lightweight bridge to accept recall or create/update commands from chat.
 * Hooks to MC endpoints (e.g., POST /mission-control/opportunities).
 */

const BASE = "/api/mission-control";

export type RecallAction = {
  type: "recall";
  query: string;
};

export type CreateAction =
  | { type: "create_opportunity"; title: string; stage?: string }
  | { type: "create_teaching_task"; title: string; status?: string }
  | { type: "create_blocker"; title: string; blockerType?: string }
  | { type: "remember"; content: string; source?: string };

export type MCAction = RecallAction | CreateAction;

export async function recall(query: string): Promise<{ results: unknown[] }> {
  const res = await fetch(`${BASE}/recall?q=${encodeURIComponent(query)}`);
  const json = await res.json();
  return { results: json.results ?? [] };
}

export async function remember(content: string, source?: string): Promise<unknown> {
  const res = await fetch(`${BASE}/memory/remember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, source }),
  });
  return res.json();
}

export async function createOpportunity(title: string, stage = "identify"): Promise<unknown> {
  const res = await fetch(`${BASE}/opportunities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, stage }),
  });
  return res.json();
}

export async function createTeachingTask(title: string, status = "backlog"): Promise<unknown> {
  const res = await fetch(`${BASE}/teaching-tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, status }),
  });
  return res.json();
}

export async function createBlocker(title: string, type = "note"): Promise<unknown> {
  const res = await fetch(`${BASE}/blockers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, type }),
  });
  return res.json();
}

export async function dispatchMCAction(action: MCAction): Promise<unknown> {
  switch (action.type) {
    case "recall":
      return recall(action.query);
    case "remember":
      return remember(action.content, action.source);
    case "create_opportunity":
      return createOpportunity(action.title, action.stage);
    case "create_teaching_task":
      return createTeachingTask(action.title, action.status);
    case "create_blocker":
      return createBlocker(action.title, action.blockerType ?? "note");
    default:
      throw new Error(`Unknown MC action: ${(action as MCAction).type}`);
  }
}
