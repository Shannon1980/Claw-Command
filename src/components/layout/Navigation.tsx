"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectionStatus from "./ConnectionStatus";

const navItems = [
  { href: "/", label: "Command" },
  { href: "/brief", label: "Brief" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/skyward", label: "Skyward" },
  { href: "/certifications", label: "Certs" },
  { href: "/chat", label: "Chat" },
  { href: "/docs", label: "Docs" },
  { href: "/calendar", label: "Calendar" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-950/95 border-b border-gray-800/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center h-12">
          <Link
            href="/"
            className="text-sm font-semibold text-gray-100 hover:text-white transition-colors mr-8"
          >
            Vorentoe
          </Link>
          <div className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded text-[13px] font-medium transition-colors ${
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
      </div>
    </nav>
  );
}
