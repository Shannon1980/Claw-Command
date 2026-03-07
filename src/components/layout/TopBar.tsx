"use client";

import { useState, useEffect } from "react";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import NotificationCenter from "@/components/layout/NotificationCenter";
import CommandPalette from "@/components/layout/CommandPalette";
import ChatFlyout from "@/components/chat/ChatFlyout";

export default function TopBar() {
  const { unreadCount, toggleBell, bellOpen } = useNotificationStore();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <div className="h-10 shrink-0 flex items-center justify-between px-4 bg-gray-950/80 border-b border-gray-800/60 backdrop-blur-sm">
        {/* Left: Search trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1 text-xs text-gray-500 hover:text-gray-300 bg-gray-900/60 hover:bg-gray-800/60 border border-gray-800 rounded-md transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline text-[10px] font-mono text-gray-600 bg-gray-800 px-1 rounded">
            Ctrl+K
          </kbd>
        </button>

        {/* Right: Status + Controls */}
        <div className="flex items-center gap-3">
          {/* Live pulse */}
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="hidden sm:inline font-mono">Live</span>
          </div>

          {/* Clock */}
          <span className="text-[11px] font-mono text-gray-500">{clock}</span>

          {/* Chat */}
          <ChatFlyout compact />

          {/* Notification bell */}
          <button
            onClick={toggleBell}
            className="relative p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notification dropdown */}
      {bellOpen && <NotificationCenter />}

      {/* Command palette */}
      {commandPaletteOpen && (
        <CommandPalette onClose={() => setCommandPaletteOpen(false)} />
      )}
    </>
  );
}
