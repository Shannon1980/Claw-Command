"use client";

import { useEffect, useRef } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import RichInput from "./RichInput";
import { useChat, AttachmentFile } from "@/lib/hooks/useChat";

interface ChatWindowProps {
  agentId: string;
  agentName: string;
  agentEmoji: string;
}

export default function ChatWindow({ agentId, agentName, agentEmoji }: ChatWindowProps) {
  const { messages, loading, sendMessage } = useChat(agentId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = (message: string, attachments: AttachmentFile[]) => {
    sendMessage(message, attachments);
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{agentEmoji}</span>
          <div>
            <h2 className="text-xl font-semibold text-gray-100">{agentName}</h2>
            <p className="text-sm text-gray-400">Agent ID: {agentId}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "shannon" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] ${
                msg.sender === "shannon"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-100"
              } rounded-lg px-4 py-3 shadow-lg relative group`}
            >
              {/* Agent header for agent messages */}
              {msg.sender === "agent" && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                  <span className="text-lg">{agentEmoji}</span>
                  <span className="text-sm font-medium text-gray-300">{agentName}</span>
                </div>
              )}

              {/* Message content */}
              <div className="prose prose-invert prose-sm max-w-none break-words">
                <MarkdownRenderer content={msg.message} />
              </div>

              {/* Attachments */}
              {msg.hasAttachments && msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
                  {msg.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                      <span>📎</span>
                      <span className="font-medium">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamp and Status */}
              <div className="mt-2 text-xs opacity-70 flex items-center justify-end gap-1">
                <span>{formatTimestamp(msg.timestamp)}</span>
                
                {msg.sender === "shannon" && (
                  <span className="ml-1 font-bold">
                    {msg.status === "sending" && "..."}
                    {msg.status === "sent" && "✓"}
                    {msg.status === "read" && "✓✓"}
                    {msg.status === "failed" && (
                      <button 
                        onClick={() => handleSend(msg.message, msg.attachments || [])}
                        className="text-red-300 hover:text-red-100 underline ml-1"
                        title="Retry"
                      >
                        Retry
                      </button>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
        <RichInput
          onSend={handleSend}
          disabled={false}
          placeholder={`Message ${agentName}...`}
        />
      </div>
    </div>
  );
}
