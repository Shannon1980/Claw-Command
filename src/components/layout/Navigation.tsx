"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ChatFlyout from "@/components/chat/ChatFlyout";

interface NavLink {
  href: string;
  label: string;
}

interface NavSection {
  title: string;
  items: NavLink[];
}

const navSections: NavSection[] = [
  {
    title: "COMMAND",
    items: [
      { href: "/", label: "Overview" },
      { href: "/agents", label: "Agents" },
      { href: "/tasks", label: "Tasks" },
      { href: "/sessions", label: "Sessions" },
    ],
  },
  {
    title: "OBSERVE",
    items: [
      { href: "/activity", label: "Activity" },
      { href: "/logs", label: "Logs" },
      { href: "/tokens", label: "Tokens" },
      { href: "/memory", label: "Memory" },
    ],
  },
  {
    title: "AUTOMATE",
    items: [
      { href: "/cron", label: "Cron" },
      { href: "/spawn", label: "Spawn" },
      { href: "/orchestration", label: "Pipelines" },
      { href: "/webhooks", label: "Webhooks" },
      { href: "/alerts", label: "Alerts" },
    ],
  },
  {
    title: "DOMAIN",
    items: [
      { href: "/brief", label: "Brief" },
      { href: "/pipeline", label: "Pipeline" },
      { href: "/certifications", label: "Certifications" },
      { href: "/calendar", label: "Calendar" },
      { href: "/email", label: "Email" },
      { href: "/docs", label: "Docs" },
      { href: "/skyward", label: "Skyward" },
    ],
  },
  {
    title: "ADMIN",
    items: [
      { href: "/settings", label: "Settings" },
      { href: "/users", label: "Users" },
      { href: "/audit", label: "Audit Log" },
      { href: "/standup", label: "Standup" },
    ],
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="w-52 shrink-0 z-[100] h-full flex flex-col bg-gray-950/95 border-r border-gray-800/80 backdrop-blur-sm">
      {/* Brand */}
      <div className="p-4 border-b border-gray-800/60">
        <Link
          href="/"
          className="text-sm font-semibold text-gray-100 hover:text-white transition-colors tracking-wide"
        >
          Vorentoe
        </Link>
        <span className="ml-2 text-[10px] font-mono text-gray-600 bg-gray-800/60 px-1.5 py-0.5 rounded">
          MC
        </span>
      </div>

      {/* Chat */}
      <div className="px-2 pt-2">
        <div className="[&>button]:w-full [&>button]:justify-start">
          <ChatFlyout />
        </div>
      </div>

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {navSections.map((section) => {
          const isCollapsed = collapsed[section.title] ?? false;
          const hasActive = section.items.some((item) => isActive(item.href));

          return (
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                className={`w-full px-3 py-1.5 flex items-center justify-between text-[10px] font-mono font-bold tracking-widest uppercase transition-colors ${
                  hasActive
                    ? "text-gray-300"
                    : "text-gray-600 hover:text-gray-400"
                }`}
              >
                {section.title}
                <svg
                  className={`w-3 h-3 transition-transform ${
                    isCollapsed ? "-rotate-90" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {!isCollapsed && (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-1.5 ml-1 rounded text-[13px] font-medium transition-colors ${
                        isActive(item.href)
                          ? "text-white bg-gray-800/80"
                          : "text-gray-500 hover:text-gray-200 hover:bg-gray-800/40"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
