"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Command Center", icon: "🎯" },
  { href: "/pipeline", label: "Pipeline", icon: "📊" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-800 bg-gray-950/50">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  active
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
