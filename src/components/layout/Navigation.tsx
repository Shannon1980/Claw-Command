"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavLink[];
}

const icon = (d: string) => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const navSections: NavSection[] = [
  {
    title: "TODAY",
    items: [
      { href: "/", label: "Overview", icon: icon("M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z") },
      { href: "/tasks", label: "Tasks", icon: icon("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01") },
      { href: "/agents", label: "Agents", icon: icon("M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z") },
      { href: "/daily-news-brief", label: "Daily Brief", icon: icon("M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16v6M17 16v6m3-13V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2z") },
      { href: "/mission-control", label: "Mission Control", icon: icon("M3 13h8V3H3v10zm10 8h8V3h-8v18zm-10 0h8v-6H3v6z") },
    ],
  },
  {
    title: "BUSINESS",
    items: [
      { href: "/deals", label: "Deals", icon: icon("M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0-4l4-4m-4 4l-4-4") },
      { href: "/opportunity-engine", label: "Opp Engine", icon: icon("M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7") },
      { href: "/certifications", label: "Certifications", icon: icon("M12 14l9-5-9-5-9 5 9 5z") },
      { href: "/calendar", label: "Calendar", icon: icon("M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z") },
      { href: "/skyward", label: "Skyward", icon: icon("M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z") },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { href: "/monitoring", label: "Monitoring", icon: icon("M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z") },
      { href: "/alerts", label: "Alerts", icon: icon("M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9") },
      { href: "/memory", label: "Memory", icon: icon("M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4") },
      { href: "/tokens", label: "Tokens", icon: icon("M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z") },
    ],
  },
  {
    title: "AUTOMATION",
    items: [
      { href: "/spawn", label: "Spawn", icon: icon("M13 10V3L4 14h7v7l9-11h-7z") },
      { href: "/orchestration", label: "Pipelines", icon: icon("M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z") },
      { href: "/skills", label: "Skills", icon: icon("M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z") },
      { href: "/webhooks", label: "Webhooks", icon: icon("M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1") },
      { href: "/chat", label: "Chat", icon: icon("M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z") },
      { href: "/email", label: "Email", icon: icon("M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z") },
      { href: "/docs", label: "Docs", icon: icon("M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z") },
      { href: "/cron", label: "Cron", icon: icon("M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z") },
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
    if (href === "/monitoring") {
      return ["/monitoring", "/activity", "/logs", "/sessions"].some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      );
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const compactItems = useMemo(() => navSections.flatMap((section) => section.items), []);

  return (
    <nav className="w-14 lg:w-56 shrink-0 z-[100] h-full flex flex-col bg-gray-950/95 border-r border-gray-800/80 backdrop-blur-sm">
      <div className="p-3 lg:p-4 border-b border-gray-800/60 flex items-center justify-center lg:justify-start">
        <Link
          href="/"
          className="text-xs lg:text-sm font-semibold text-gray-100 hover:text-white transition-colors tracking-wide"
          title="Vorentoe Command"
        >
          <span className="lg:hidden">VC</span>
          <span className="hidden lg:inline">Vorentoe</span>
        </Link>
        <span className="hidden lg:inline ml-2 text-[10px] font-mono text-gray-600 bg-gray-800/60 px-1.5 py-0.5 rounded">MC</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        <div className="lg:hidden flex flex-col gap-1 px-1">
          {compactItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center justify-center p-2 rounded-md transition-colors ${
                isActive(item.href)
                  ? "text-white bg-gray-800/80"
                  : "text-gray-500 hover:text-gray-200 hover:bg-gray-800/40"
              }`}
            >
              {item.icon}
            </Link>
          ))}
        </div>

        <div className="hidden lg:block">
          {navSections.map((section) => {
            const isCollapsed = collapsed[section.title] ?? false;
            const hasActive = section.items.some((item) => isActive(item.href));

            return (
              <div key={section.title}>
                <button
                  onClick={() => toggleSection(section.title)}
                  className={`w-full px-3 py-1.5 flex items-center justify-between text-[10px] font-mono font-bold tracking-widest uppercase transition-colors ${
                    hasActive ? "text-gray-300" : "text-gray-600 hover:text-gray-400"
                  }`}
                >
                  {section.title}
                  <svg className={`w-3 h-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {!isCollapsed && (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 px-3 py-1.5 ml-1 rounded text-[13px] font-medium transition-colors ${
                          isActive(item.href)
                            ? "text-white bg-gray-800/80 border-l-2 border-cyan-400"
                            : "text-gray-500 hover:text-gray-200 hover:bg-gray-800/40"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
