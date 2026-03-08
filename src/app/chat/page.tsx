"use client";

import { useState, useEffect, useMemo } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAgentStore } from "@/lib/stores/agentStore";
import { useChatStore } from "@/lib/stores/chatStore";

interface ChatAgent {
  id: string;
  name: string;
  emoji: string;
  role: string;
}

export default function ChatPage() {
  const { agents: storeAgents, loading, fetchAgents } = useAgentStore();
  const { unreadCounts, recentNotifications, clearUnread } = useChatStore();
  const [selectedAgent, setSelectedAgent] = useState<ChatAgent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const agents: ChatAgent[] = storeAgents.map((a) => ({
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    role: a.domain || "agent",
  }));

  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0]);
    }
  }, [agents, selectedAgent]);

  // Get last message preview for each agent from notifications
  const lastMessages = useMemo(() => {
    const map: Record<string, { preview: string; timestamp: string }> = {};
    for (const notif of recentNotifications) {
      if (!map[notif.agentId]) {
        map[notif.agentId] = {
          preview: notif.preview,
          timestamp: notif.timestamp,
        };
      }
    }
    return map;
  }, [recentNotifications]);

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;
    const q = searchQuery.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q)
    );
  }, [agents, searchQuery]);

  const formatSidebarTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (msgDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="h-screen flex">
        {/* Sidebar - WhatsApp-style agent list */}
        <div className="w-80 border-r border-gray-800 bg-gray-900/50 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/80">
            <h1 className="text-lg font-bold text-gray-100">Chats</h1>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-800/50">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat"
                className="w-full pl-9 pr-3 py-1.5 bg-gray-800 border border-gray-700/40 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* Agent list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center text-gray-400 py-8 text-sm">
                Loading agents...
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm">
                {searchQuery ? "No agents match your search" : "No agents available"}
              </div>
            ) : (
              <div>
                {filteredAgents.map((agent) => {
                  const unread = unreadCounts[agent.id] || 0;
                  const lastMsg = lastMessages[agent.id];
                  const isSelected = selectedAgent?.id === agent.id;

                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgent(agent);
                        clearUnread(agent.id);
                      }}
                      className={`w-full text-left px-3 py-3 transition-colors border-b border-gray-800/30 ${
                        isSelected
                          ? "bg-gray-800/80"
                          : "hover:bg-gray-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar with online indicator */}
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-xl">
                            {agent.emoji}
                          </div>
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-gray-900" />
                        </div>

                        {/* Name + preview */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-gray-100 truncate">
                              {agent.name}
                            </span>
                            <span className={`text-[11px] shrink-0 ml-2 ${unread > 0 ? "text-emerald-400" : "text-gray-500"}`}>
                              {lastMsg ? formatSidebarTime(lastMsg.timestamp) : ""}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-xs text-gray-400 truncate pr-2">
                              {lastMsg ? lastMsg.preview : agent.role}
                            </span>
                            {unread > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold bg-emerald-600 text-white rounded-full shrink-0">
                                {unread > 99 ? "99+" : unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col relative">
          {selectedAgent ? (
            <ChatWindow
              agentId={selectedAgent.id}
              agentName={selectedAgent.name}
              agentEmoji={selectedAgent.emoji}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-950">
              <div className="text-center">
                <div className="w-64 h-64 mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-48 h-48 text-gray-800" fill="none" viewBox="0 0 24 24">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-xl text-gray-300 font-light">Agent Command Chat</p>
                <p className="text-sm text-gray-500 mt-2 max-w-sm">
                  Send and receive messages with your AI agents in real time.
                  Select an agent from the sidebar to begin.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
