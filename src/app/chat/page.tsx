"use client";

import { useState, useEffect } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAgentStore } from "@/lib/stores/agentStore";
import { useChatStore } from "@/lib/stores/chatStore";

interface ChatAgent {
  id: string;
  name: string;
  emoji: string;
  role: string;
}

function toChatAgent(row: { id: string; name: string; emoji: string; domain?: string }): ChatAgent {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    role: row.domain || "agent",
  };
}

export default function ChatPage() {
  const { agents: storeAgents, loading, fetchAgents } = useAgentStore();
  const { unreadCounts, clearUnread } = useChatStore();
  const [selectedAgent, setSelectedAgent] = useState<ChatAgent | null>(null);

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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="h-screen flex">
        {/* Sidebar - Agent list */}
        <div className="w-80 border-r border-gray-800 bg-gray-900/50 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-800">
            <h1 className="text-2xl font-bold text-gray-100">💬 Agent Chat</h1>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-time agent chat
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center text-gray-400 py-8">
                Loading agents...
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No agents available
              </div>
            ) : (
              <div className="space-y-2">
                {agents.map((agent) => {
                  const unread = unreadCounts[agent.id] || 0;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgent(agent);
                        clearUnread(agent.id);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedAgent?.id === agent.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 hover:bg-gray-700 text-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{agent.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate flex items-center gap-2">
                            {agent.name}
                            {unread > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                                {unread > 9 ? "9+" : unread}
                              </span>
                            )}
                          </div>
                          <div className="text-sm opacity-75 truncate">{agent.role}</div>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {selectedAgent ? (
            <ChatWindow
              agentId={selectedAgent.id}
              agentName={selectedAgent.name}
              agentEmoji={selectedAgent.emoji}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-xl">Select an agent to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
