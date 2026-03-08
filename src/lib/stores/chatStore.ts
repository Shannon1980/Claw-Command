"use client";

import { create } from "zustand";

export interface ChatNotification {
  agentId: string;
  agentName?: string;
  preview: string;
  timestamp: string;
  read: boolean;
}

interface ChatStore {
  /** Unread message counts per agent */
  unreadCounts: Record<string, number>;
  /** Recent chat notifications for the bell / sidebar */
  recentNotifications: ChatNotification[];

  incrementUnread: (agentId: string) => void;
  clearUnread: (agentId: string) => void;
  handleSSEEvent: (data: Record<string, unknown>) => void;
}

export const useChatStore = create<ChatStore>()((set) => ({
  unreadCounts: {},
  recentNotifications: [],

  incrementUnread: (agentId: string) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [agentId]: (state.unreadCounts[agentId] || 0) + 1,
      },
    })),

  clearUnread: (agentId: string) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [agentId]: 0,
      },
    })),

  handleSSEEvent: (data: Record<string, unknown>) => {
    const event = data.event as string;
    if (event !== "new_message") return;

    const message = data.message as Record<string, unknown> | undefined;
    if (!message || message.sender !== "agent") return;

    const agentId = message.agentId as string;
    const content = (message.content as string) || "";
    const preview = content.length > 80 ? content.slice(0, 80) + "..." : content;

    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [agentId]: (state.unreadCounts[agentId] || 0) + 1,
      },
      recentNotifications: [
        {
          agentId,
          preview,
          timestamp: (message.timestamp as string) || new Date().toISOString(),
          read: false,
        },
        ...state.recentNotifications.slice(0, 19),
      ],
    }));
  },
}));
