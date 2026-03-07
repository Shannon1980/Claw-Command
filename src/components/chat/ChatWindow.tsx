"use client";

import { useEffect, useRef, useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import RichInput from "./RichInput";
import { useChat, AttachmentFile } from "@/lib/hooks/useChat";

interface ChatWindowProps {
  agentId: string;
  agentName: string;
  agentEmoji: string;
}

export default function ChatWindow({ agentId, agentName, agentEmoji }: ChatWindowProps) {
  const { messages, loading, error, sendMessage, agentTyping } = useChat(agentId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mcResult, setMcResult] = useState<string | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (message: string, attachments: AttachmentFile[]) => {
    const trimmed = message.trim();
    if (trimmed.startsWith("/recall ")) {
      const query = trimmed.slice(8).trim();
      setMcResult(null);
      try {
        const res = await fetch(`/api/memory/recall?q=${encodeURIComponent(query)}`);
        const results = await res.json();
        const items = Array.isArray(results) ? results : [];
        const text = items.length > 0
          ? items.map((r: { content?: string }) => r.content ?? JSON.stringify(r)).join("\n\n")
          : "No memories found.";
        setMcResult(`**Recall:** ${query}\n\n${text}`);
        setTimeout(() => setMcResult(null), 8000);
      } catch (err) {
        setMcResult(`Recall failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
      return;
    }
    if (trimmed.startsWith("/remember ")) {
      const content = trimmed.slice(10).trim();
      setMcResult(null);
      try {
        await fetch("/api/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, source: "chat" }),
        });
        setMcResult(`Remembered: "${content}"`);
        setTimeout(() => setMcResult(null), 5000);
      } catch (err) {
        setMcResult(`Remember failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
      return;
    }
    sendMessage(message, attachments);
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header with live indicator */}
      <div className="px-4 py-2.5 border-b border-gray-800/50 flex items-center gap-3">
        <span className="text-2xl">{agentEmoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-100 text-sm">{agentName}</div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-emerald-400">Live</span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-950/40 border-b border-red-900/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-600">Start a conversation with {agentName}</p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                  isUser
                    ? "bg-blue-600 text-white"
                    : "bg-gray-900 text-gray-200 border border-gray-800/50"
                }`}
              >
                {/* Message content */}
                <div className="prose prose-invert prose-sm max-w-none break-words [&>p]:my-0 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
                  <MarkdownRenderer content={msg.content} />
                  {msg.streaming && (
                    <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle rounded-sm" />
                  )}
                </div>

                {/* Attachments */}
                {msg.hasAttachments && msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-0.5">
                    {msg.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs opacity-80">
                        <span>+</span>
                        <span>{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <div className={`mt-1 text-[10px] flex items-center justify-end gap-1 ${isUser ? "text-blue-200/50" : "text-gray-600"}`}>
                  <span>{formatTimestamp(msg.timestamp)}</span>
                  {isUser && (
                    <span>
                      {msg.status === "sending" && "..."}
                      {msg.status === "sent" && "sent"}
                      {msg.status === "read" && "read"}
                      {msg.status === "failed" && (
                        <button
                          onClick={() => handleSend(msg.content, msg.attachments || [])}
                          className="text-red-300 hover:text-red-100 underline"
                        >
                          retry
                        </button>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {agentTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-900 border border-gray-800/50 rounded-2xl px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 mr-1">{agentEmoji}</span>
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* MC Result */}
      {mcResult && (
        <div className="mx-4 mb-2 px-3 py-2 bg-gray-900/80 border border-gray-800/50 rounded-lg">
          <div className="prose prose-invert prose-sm max-w-none text-xs">
            <MarkdownRenderer content={mcResult} />
          </div>
          <button
            onClick={() => setMcResult(null)}
            className="mt-1 text-[10px] text-gray-600 hover:text-gray-400"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800/50">
        <RichInput
          onSend={handleSend}
          disabled={false}
          placeholder={`Message ${agentName}...`}
        />
      </div>
    </div>
  );
}
