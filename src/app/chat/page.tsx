"use client";

import { useState, useEffect } from "react";
import ChatWindow from "@/components/chat/ChatWindow";

interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
}

function toChatAgent(row: { id: string; name: string; emoji: string; domain?: string }): Agent {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    role: row.domain || "agent",
  };
}

export default function ChatPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/agents");
      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not { agents: [...] }
        const rows = Array.isArray(data) ? data : (data?.agents ?? []);
        const list = rows.map(toChatAgent);
        setAgents(list);
        if (list.length > 0) {
          setSelectedAgent(list[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="h-screen flex">
        {/* Sidebar - Agent list */}
        <div className="w-80 border-r border-gray-800 bg-gray-900/50 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-800">
            <h1 className="text-2xl font-bold text-gray-100">💬 Agent Chat</h1>
            <p className="text-sm text-gray-400 mt-1">
              Message your autonomous agents
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
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedAgent?.id === agent.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 hover:bg-gray-700 text-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{agent.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{agent.name}</div>
                        <div className="text-sm opacity-75 truncate">{agent.role}</div>
                      </div>
                    </div>
                  </button>
                ))}
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
