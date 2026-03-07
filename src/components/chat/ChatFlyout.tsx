"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import ChatWindow from "./ChatWindow";
import { useAgentStore } from "@/lib/stores/agentStore";

interface ChatFlyoutProps {
  compact?: boolean;
}

export default function ChatFlyout({ compact = false }: ChatFlyoutProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<{
    id: string;
    name: string;
    emoji: string;
  } | null>(null);
  const agents = useAgentStore((s) => s.agents);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgent) {
      setSelectedAgent({
        id: agents[0].id,
        name: agents[0].name,
        emoji: agents[0].emoji,
      });
    }
  }, [agents, selectedAgent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const agentList = agents ?? [];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1 rounded transition-colors ${
          compact
            ? "p-1.5 text-gray-500 hover:text-gray-300"
            : "px-3 py-2 text-[13px] font-medium text-gray-500 hover:text-gray-200 hover:bg-gray-800/40"
        }`}
        aria-label="Open chat"
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
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {!compact && <span>Chat</span>}
      </button>

      {isOpen &&
        mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
              style={{ zIndex: 9998 }}
            />
            <div
              className="fixed top-0 right-0 h-full w-full max-w-xl bg-gray-950 border-l border-gray-800/50 shadow-2xl flex flex-col"
              aria-modal="true"
              aria-label="Agent chat"
              style={{ zIndex: 9999 }}
            >
              {/* Flyout header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/50 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-400">Chat</span>
                  {/* Agent switcher */}
                  {agentList.length > 0 && (
                    <select
                      value={selectedAgent?.id ?? ""}
                      onChange={(e) => {
                        const agent = agentList.find((a) => a.id === e.target.value);
                        if (agent) setSelectedAgent({ id: agent.id, name: agent.name, emoji: agent.emoji });
                      }}
                      className="px-2 py-1 text-sm bg-gray-900 border border-gray-800 rounded-md text-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      {agentList.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Chat area — full width */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {selectedAgent ? (
                  <ChatWindow
                    agentId={selectedAgent.id}
                    agentName={selectedAgent.name}
                    agentEmoji={selectedAgent.emoji}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center h-full text-gray-600 text-sm">
                    No agents available
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
