"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface CommandItem {
  id: string;
  label: string;
  category: string;
  action: () => void;
  keywords?: string;
}

interface CommandPaletteProps {
  onClose: () => void;
}

export default function CommandPalette({ onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose]
  );

  const commands: CommandItem[] = [
    // Navigation
    { id: "nav-overview", label: "Go to Overview", category: "Navigate", action: () => navigate("/"), keywords: "home dashboard" },
    { id: "nav-agents", label: "Go to Agents", category: "Navigate", action: () => navigate("/agents"), keywords: "agent manage" },
    { id: "nav-tasks", label: "Go to Tasks", category: "Navigate", action: () => navigate("/tasks"), keywords: "task kanban board" },
    { id: "nav-sessions", label: "Go to Sessions", category: "Navigate", action: () => navigate("/sessions"), keywords: "session openclaw" },
    { id: "nav-activity", label: "Go to Activity", category: "Navigate", action: () => navigate("/activity"), keywords: "activity feed events" },
    { id: "nav-logs", label: "Go to Logs", category: "Navigate", action: () => navigate("/logs"), keywords: "log viewer" },
    { id: "nav-tokens", label: "Go to Tokens", category: "Navigate", action: () => navigate("/tokens"), keywords: "token cost budget" },
    { id: "nav-memory", label: "Go to Memory", category: "Navigate", action: () => navigate("/memory"), keywords: "memory knowledge recall" },
    { id: "nav-cron", label: "Go to Cron Jobs", category: "Navigate", action: () => navigate("/cron"), keywords: "cron schedule job" },
    { id: "nav-spawn", label: "Go to Spawn", category: "Navigate", action: () => navigate("/spawn"), keywords: "spawn agent" },
    { id: "nav-pipelines", label: "Go to Pipelines", category: "Navigate", action: () => navigate("/orchestration"), keywords: "pipeline orchestration workflow" },
    { id: "nav-webhooks", label: "Go to Webhooks", category: "Navigate", action: () => navigate("/webhooks"), keywords: "webhook integration" },
    { id: "nav-alerts", label: "Go to Alerts", category: "Navigate", action: () => navigate("/alerts"), keywords: "alert rule notification" },
    { id: "nav-brief", label: "Go to Brief", category: "Navigate", action: () => navigate("/brief"), keywords: "brief daily" },
    { id: "nav-pipeline", label: "Go to BD Pipeline", category: "Navigate", action: () => navigate("/pipeline"), keywords: "pipeline opportunity" },
    { id: "nav-certs", label: "Go to Certifications", category: "Navigate", action: () => navigate("/certifications"), keywords: "certification mbe" },
    { id: "nav-calendar", label: "Go to Calendar", category: "Navigate", action: () => navigate("/calendar"), keywords: "calendar event" },
    { id: "nav-email", label: "Go to Email", category: "Navigate", action: () => navigate("/email"), keywords: "email gmail" },
    { id: "nav-docs", label: "Go to Docs", category: "Navigate", action: () => navigate("/docs"), keywords: "document" },
    { id: "nav-settings", label: "Go to Settings", category: "Navigate", action: () => navigate("/settings"), keywords: "settings config" },
    // Quick actions
    { id: "act-spawn", label: "Spawn Agent", category: "Action", action: () => navigate("/spawn"), keywords: "spawn new agent create" },
    { id: "act-task", label: "Create Task", category: "Action", action: () => navigate("/tasks"), keywords: "new task create add" },
    { id: "act-memory", label: "Add Memory", category: "Action", action: () => navigate("/memory"), keywords: "remember memory add" },
  ];

  const filtered = query.trim()
    ? commands.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.category.toLowerCase().includes(q) ||
          (cmd.keywords && cmd.keywords.toLowerCase().includes(q))
        );
      })
    : commands;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, selectedIndex, onClose]);

  const categories = [...new Set(filtered.map((c) => c.category))];

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-800">
          <svg
            className="w-4 h-4 text-gray-500 mr-3"
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
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder:text-gray-600 outline-none"
          />
          <kbd className="text-[10px] font-mono text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-600">
              No results found
            </div>
          )}
          {categories.map((cat) => (
            <div key={cat}>
              <div className="px-4 py-1 text-[10px] font-mono font-bold text-gray-600 uppercase tracking-wider">
                {cat}
              </div>
              {filtered
                .filter((c) => c.category === cat)
                .map((cmd) => {
                  const idx = filtered.indexOf(cmd);
                  return (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        idx === selectedIndex
                          ? "bg-gray-800 text-white"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {cmd.label}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
