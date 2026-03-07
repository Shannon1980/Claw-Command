"use client";

import { create } from "zustand";

export interface Session {
  id: string;
  agentId: string | null;
  agentName?: string;
  status: "active" | "idle" | "ended";
  messageCount: number;
  tokenCount: number;
  costCents: number;
  createdAt: string;
  endedAt: string | null;
  duration?: string;
}

interface SessionStore {
  sessions: Session[];
  selectedSessionId: string | null;
  loading: boolean;
  error: string | null;

  fetchSessions: () => Promise<void>;
  selectSession: (id: string | null) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  addSession: (session: Session) => void;
  removeSession: (id: string) => void;
  handleSSEEvent: (data: Record<string, unknown>) => void;
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  sessions: [],
  selectedSessionId: null,
  loading: false,
  error: null,

  fetchSessions: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      set({ sessions: Array.isArray(data) ? data : [], loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  selectSession: (id) => set({ selectedSessionId: id }),

  updateSession: (id, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  addSession: (session) =>
    set((state) => ({
      sessions: [
        session,
        ...state.sessions.filter((s) => s.id !== session.id),
      ],
    })),

  removeSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
    })),

  handleSSEEvent: (data) => {
    const sessionId = data.sessionId as string;
    const action = data.action as string;
    if (!sessionId) return;

    if (action === "ended") {
      get().updateSession(sessionId, { status: "ended", endedAt: new Date().toISOString() });
    } else if (action === "started" && data.session) {
      get().addSession(data.session as Session);
    } else {
      get().updateSession(sessionId, data as Partial<Session>);
    }
  },
}));
