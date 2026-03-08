"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type TaskStatus =
  | "inbox"
  | "backlog"
  | "in_progress"
  | "review"
  | "quality_review"
  | "blocked"
  | "done";

export type TaskPriority = "high" | "medium" | "low";

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedToAgentId: string | null;
  dependsOnShannon: boolean;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  outcome?: string | null;
  project?: string | null;
  ticketRef?: string | null;
  parentOpportunityId?: string | null;
  parentApplicationId?: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  agent_name?: string;
  agent_emoji?: string;
  agent_domain?: string;
  comment_count?: number;
  linked_doc_count?: number;
}

interface TaskFilters {
  status?: TaskStatus;
  agent?: string;
  project?: string;
  priority?: TaskPriority;
  search?: string;
}

interface TaskStore {
  tasks: Task[];
  filters: TaskFilters;
  loading: boolean;
  error: string | null;

  fetchTasks: () => Promise<void>;
  setFilters: (filters: Partial<TaskFilters>) => void;
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  handleSSEEvent: (data: Record<string, unknown>) => void;
  filteredTasks: () => Task[];
}

export const useTaskStore = create<TaskStore>()(
  subscribeWithSelector((set, get) => ({
    tasks: [],
    filters: {},
    loading: false,
    error: null,

    fetchTasks: async () => {
      set({ loading: true, error: null });
      try {
        const res = await fetch("/api/tasks?all=true");
        if (!res.ok) throw new Error("Failed to fetch tasks");
        const data = await res.json();
        const rows = Array.isArray(data) ? data : [];
        const tasks: Task[] = rows.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          title: r.title as string,
          description: (r.description as string) || "",
          assignedToAgentId: (r.assigned_to_agent_id ?? r.assignedToAgentId ?? null) as string | null,
          dependsOnShannon: (r.depends_on_shannon ?? r.dependsOnShannon ?? false) as boolean,
          status: (r.status as TaskStatus) || "backlog",
          priority: (r.priority as TaskPriority) || "medium",
          dueDate: (r.due_date ?? r.dueDate ?? null) as string | null,
          outcome: (r.outcome as string) || null,
          project: (r.project as string) || null,
          ticketRef: (r.ticket_ref ?? r.ticketRef ?? null) as string | null,
          parentOpportunityId: (r.parent_opportunity_id ?? r.parentOpportunityId ?? null) as string | null,
          parentApplicationId: (r.parent_application_id ?? r.parentApplicationId ?? null) as string | null,
          createdAt: ((r.created_at ?? r.createdAt) as string) || new Date().toISOString(),
          updatedAt: ((r.updated_at ?? r.updatedAt) as string) || new Date().toISOString(),
          agent_name: (r.agent_name as string) || "Shannon",
          agent_emoji: (r.agent_emoji as string) || "👤",
          agent_domain: (r.agent_domain as string) || undefined,
          comment_count: (r.comment_count as number) || undefined,
          linked_doc_count: (r.linked_doc_count as number) || undefined,
        }));
        set({ tasks, loading: false });
      } catch (err) {
        set({ error: (err as Error).message, loading: false });
      }
    },

    setFilters: (filters) =>
      set((state) => ({ filters: { ...state.filters, ...filters } })),

    moveTask: async (taskId, newStatus) => {
      // Optimistic update
      const prev = get().tasks;
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
            : t
        ),
      }));
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          set({ tasks: prev }); // rollback
          throw new Error("Failed to move task");
        }
      } catch (err) {
        set({ tasks: prev, error: (err as Error).message });
      }
    },

    updateTask: (taskId, updates) =>
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, ...updates } : t
        ),
      })),

    addTask: (task) =>
      set((state) => ({
        tasks: [task, ...state.tasks.filter((t) => t.id !== task.id)],
      })),

    removeTask: (taskId) =>
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== taskId),
      })),

    handleSSEEvent: (data) => {
      const taskId = data.taskId as string;
      const action = data.action as string;
      if (!taskId) return;

      if (action === "deleted") {
        get().removeTask(taskId);
      } else if (action === "created" && data.task) {
        get().addTask(data.task as Task);
      } else {
        const existing = get().tasks.find((t) => t.id === taskId);
        if (existing) {
          get().updateTask(taskId, data as Partial<Task>);
        }
      }
    },

    filteredTasks: () => {
      const { tasks, filters } = get();
      return tasks.filter((t) => {
        if (filters.status && t.status !== filters.status) return false;
        if (filters.agent && t.assignedToAgentId !== filters.agent) return false;
        if (filters.project && t.project !== filters.project) return false;
        if (filters.priority && t.priority !== filters.priority) return false;
        if (
          filters.search &&
          !t.title.toLowerCase().includes(filters.search.toLowerCase())
        )
          return false;
        return true;
      });
    },
  }))
);
