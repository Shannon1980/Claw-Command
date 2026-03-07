"use client";

import { useEffect } from "react";
import { useNotificationStore } from "@/lib/stores/notificationStore";

export default function NotificationCenter() {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllRead, toggleBell } =
    useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="fixed top-10 right-4 z-[150] w-80 max-h-96 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[10px] text-cyan-500 hover:text-cyan-400 font-mono"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={toggleBell}
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            &times;
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-80">
        {notifications.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-gray-600 font-mono">
            No notifications
          </div>
        )}
        {notifications.map((notif) => (
          <button
            key={notif.id}
            onClick={() => markAsRead(notif.id)}
            className={`w-full text-left px-3 py-2.5 border-b border-gray-800/50 transition-colors hover:bg-gray-800/40 ${
              notif.readAt ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start gap-2">
              {!notif.readAt && (
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-200 truncate">
                  {notif.title}
                </p>
                {notif.body && (
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                    {notif.body}
                  </p>
                )}
                <p className="text-[10px] text-gray-600 mt-1 font-mono">
                  {new Date(notif.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
