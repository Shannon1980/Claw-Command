"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ChatFlyout from "@/components/chat/ChatFlyout";

type NavItem =
  | { href: string; label: string }
  | {
      label: string;
      children: { href: string; label: string }[];
    };

const navItems: NavItem[] = [
  { href: "/", label: "Command" },
  {
    label: "Brief",
    children: [
      { href: "/brief", label: "General Brief" },
      { href: "/skyward", label: "Skyward Brief" },
    ],
  },
  { href: "/tasks", label: "Tasks" },
  { href: "/mission-control", label: "Mission Control" },
  { href: "/pipeline", label: "Pipeline" },
  {
    label: "Docs",
    children: [
      { href: "/docs", label: "Documents" },
      { href: "/certifications", label: "Certifications" },
    ],
  },
  { href: "/calendar", label: "Calendar" },
  { href: "/email", label: "Email" },
  { href: "/tokens", label: "Tokens" },
];

function isDropdown(item: NavItem): item is { label: string; children: { href: string; label: string }[] } {
  return "children" in item && Array.isArray(item.children);
}

function isActiveInDropdown(
  pathname: string,
  children: { href: string; label: string }[]
): boolean {
  return children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"));
}

export default function Navigation() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideAnyDropdown = Object.values(dropdownRefs.current).some(
        (el) => el?.contains(target)
      );
      if (!isInsideAnyDropdown) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="w-52 shrink-0 z-[100] h-full flex flex-col bg-gray-950/95 border-r border-gray-800/80 backdrop-blur-sm">
      <div className="p-4 border-b border-gray-800/60">
        <Link
          href="/"
          className="text-sm font-semibold text-gray-100 hover:text-white transition-colors"
        >
          Vorentoe
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-2">
          <div className="[&>button]:w-full [&>button]:justify-start">
            <ChatFlyout />
          </div>
        </div>
        <div className="flex flex-col gap-0.5 mt-2">
          {navItems.map((item) => {
            if (isDropdown(item)) {
              const isOpen = openDropdown === item.label;
              const active = isActiveInDropdown(pathname, item.children);
              return (
                <div
                  key={item.label}
                  ref={(el) => {
                    dropdownRefs.current[item.label] = el;
                  }}
                  className="relative"
                >
                  <button
                    onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                    className={`w-full px-3 py-2 rounded text-[13px] font-medium transition-colors flex items-center justify-between ${
                      active
                        ? "text-white bg-gray-800/80"
                        : "text-gray-500 hover:text-gray-200 hover:bg-gray-800/40"
                    }`}
                  >
                    {item.label}
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="absolute left-full top-0 ml-0.5 py-1 min-w-[140px] bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-[110]">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpenDropdown(null)}
                          className={`block px-4 py-2 text-[13px] transition-colors ${
                            pathname === child.href
                              ? "text-white bg-gray-800"
                              : "text-gray-400 hover:text-gray-100 hover:bg-gray-800/60"
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded text-[13px] font-medium transition-colors ${
                  isActive
                    ? "text-white bg-gray-800/80"
                    : "text-gray-500 hover:text-gray-200 hover:bg-gray-800/40"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
