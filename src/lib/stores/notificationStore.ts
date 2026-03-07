"use client";

import { create } from "zustand";

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  resourceUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  bellOpen: boolean;

  fetchNotifications: (limit?: number) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  toggleBell: () => void;
  addNotification: (notif: Notification) => void;
  handleSSEEvent: (data: Record<string, unknown>) => void;
}

export const useNotificationStore = create<NotificationStore>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  bellOpen: false,

  fetchNotifications: async (limit = 50) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/notifications?limit=${limit}`);
      if (!res.ok) return;
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      const unread = items.filter(
        (n: Notification) => n.readAt === null
      ).length;
      set({ notifications: items, unreadCount: unread, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  markAsRead: async (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(
      () => {}
    );
  },

  markAllRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        readAt: n.readAt || new Date().toISOString(),
      })),
      unreadCount: 0,
    }));
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(
      () => {}
    );
  },

  toggleBell: () => set((state) => ({ bellOpen: !state.bellOpen })),

  addNotification: (notif) =>
    set((state) => ({
      notifications: [notif, ...state.notifications],
      unreadCount: state.unreadCount + (notif.readAt ? 0 : 1),
    })),

  handleSSEEvent: (data) => {
    get().addNotification({
      id: (data.id as string) || `notif-${Date.now()}`,
      title: (data.title as string) || "",
      body: (data.body as string) || "",
      type: (data.type as string) || "info",
      resourceUrl: (data.resourceUrl as string) || null,
      readAt: null,
      createdAt: new Date().toISOString(),
    });
  },
}));
