"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SettingsDropdownProps {
  onClose: () => void;
}

const icon = (d: string) => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const adminLinks = [
  { href: "/settings", label: "Settings", icon: icon("M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z") },
  { href: "/users", label: "Users", icon: icon("M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z") },
  { href: "/audit", label: "Audit Log", icon: icon("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4") },
  { href: "/standup", label: "Standup", icon: icon("M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z") },
];

export default function SettingsDropdown({ onClose }: SettingsDropdownProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Backdrop - exclude nav (w-14 lg:w-56) so sidebar stays clickable */}
      <div className="fixed top-10 left-14 lg:left-56 bottom-0 right-0 z-[140]" onClick={onClose} />

      {/* Dropdown */}
      <div className="fixed top-10 right-4 z-[150] w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
          <span className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">
            Admin
          </span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            &times;
          </button>
        </div>

        {/* Links */}
        <div className="py-1">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                isActive(link.href)
                  ? "text-white bg-gray-800/80"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
