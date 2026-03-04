"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Command Center", icon: "🎯" },
  { href: "/brief", label: "Daily Brief", icon: "📊" },
  { href: "/pipeline", label: "Pipeline", icon: "🔄" },
  { href: "/skyward", label: "Skyward", icon: "🌤️" },
<<<<<<< feature/docs-manager
  { href: "/docs", label: "Docs", icon: "📄" },
=======
  { href: "/calendar", label: "Calendar", icon: "📅" },
>>>>>>> main
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl font-bold text-gray-100 hover:text-gray-300 transition-colors"
            >
              Vorentoe Command
            </Link>
            <div className="flex gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive
                        ? "bg-gray-800 text-gray-100"
                        : "text-gray-400 hover:text-gray-100 hover:bg-gray-800/50"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
