"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import { useAgentStore } from "@/lib/stores/agentStore";
import { useTaskStore } from "@/lib/stores/taskStore";
import NotificationCenter from "@/components/layout/NotificationCenter";
import CommandPalette from "@/components/layout/CommandPalette";
import SettingsDropdown from "@/components/layout/SettingsDropdown";
import ChatFlyout from "@/components/chat/ChatFlyout";
import ConnectionStatus from "@/components/layout/ConnectionStatus";
import { useWeather, getWeatherEmoji } from "@/lib/hooks/useWeather";

export default function TopBar() {
  const pathname = usePathname();
  const { unreadCount, toggleBell, bellOpen } = useNotificationStore();
  const { agents } = useAgentStore();
  const { tasks } = useTaskStore();
  const { weather } = useWeather();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clock, setClock] = useState("");

  const adminRoutes = ["/settings", "/users", "/audit", "/standup"];
  const isOnAdminPage = adminRoutes.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  const agentsOnline = agents.filter((a) => a.status === "active").length;
  const tasksBlocked = tasks.filter((t) => t.status === "blocked").length;
  const tasksReview = tasks.filter(
    (t) => t.status === "review" || t.status === "quality_review"
  ).length;

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
      <div className="h-10 shrink-0 flex items-center justify-between px-4 bg-gray-950/80 border-b border-gray-800/60 backdrop-blur-sm pointer-events-auto">
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

        {/* Center: Quick status indicators */}
        <div className="hidden md:flex items-center gap-4 text-[11px] font-mono">
          <Link
            href="/agents"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span>{agentsOnline} agent{agentsOnline !== 1 ? "s" : ""}</span>
          </Link>
          {tasksReview > 0 && (
            <Link
              href="/tasks"
              className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <span>{tasksReview} review</span>
            </Link>
          )}
          {tasksBlocked > 0 && (
            <Link
              href="/tasks"
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span>{tasksBlocked} blocked</span>
            </Link>
          )}
        </div>

        {/* Right: Status + Controls */}
        <div className="flex items-center gap-3">
          {/* Gateway connection status (real-time) */}
          <ConnectionStatus />

          {/* Weather + Clock */}
          {weather && (
            <span className="text-[11px] font-mono text-gray-400">
              {getWeatherEmoji(weather.icon)} {weather.temperature}&deg;F
            </span>
          )}
          <span className="text-[11px] font-mono text-gray-500">{clock}</span>

          {/* Chat */}
          <ChatFlyout compact />

          {/* Settings gear */}
          <button
            onClick={() => {
              setSettingsOpen((prev) => !prev);
              if (bellOpen) toggleBell();
            }}
            className={`relative p-1.5 transition-colors ${
              isOnAdminPage || settingsOpen
                ? "text-cyan-400 hover:text-cyan-300"
                : "text-gray-500 hover:text-gray-300"
            }`}
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* Notification bell */}
          <button
            onClick={() => {
              toggleBell();
              if (settingsOpen) setSettingsOpen(false);
            }}
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

      {/* Settings dropdown */}
      {settingsOpen && (
        <SettingsDropdown onClose={() => setSettingsOpen(false)} />
      )}

      {/* Command palette */}
      {commandPaletteOpen && (
        <CommandPalette onClose={() => setCommandPaletteOpen(false)} />
      )}
    </>
  );
}
