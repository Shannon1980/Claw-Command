/**
 * Mission Control data model types.
 * Single MC data layer for dashboards, APIs, and future microservices.
 */

export type Opportunity = {
  id: string;
  title: string;
  stage: string;
  valueUsd?: number;
  probability?: number;
  ownerAgentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type TeachingTask = {
  id: string;
  title: string;
  status: "backlog" | "ready" | "in_progress" | "review" | "done";
  priority?: "high" | "medium" | "low";
  assignedToAgentId?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Blocker = {
  id: string;
  title: string;
  type: "extension" | "dependency" | "note";
  status: "open" | "resolved";
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Agent = {
  id: string;
  name: string;
  emoji?: string;
  status?: "active" | "idle" | "offline";
  domain?: string;
};

export type ScheduleBlock = {
  id: string;
  title: string;
  start: string;
  end: string;
  agentId?: string;
  type?: "task" | "meeting" | "blocker";
  notes?: string;
};

export type MemoryItem = {
  id: string;
  content: string;
  source?: string;
  tags?: string[];
  createdAt: string;
};

export type Recall = {
  id: string;
  query: string;
  results: MemoryItem[];
  createdAt: string;
};
