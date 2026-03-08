"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import RichInput from "./RichInput";
import { useChat, AttachmentFile } from "@/lib/hooks/useChat";

interface ChatWindowProps {
  agentId: string;
  agentName: string;
  agentEmoji: string;
}

function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateSeparator(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) return "Today";
  if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export default function ChatWindow({ agentId, agentName, agentEmoji }: ChatWindowProps) {
  const { messages, loading, error, sendMessage, agentTyping } = useChat(agentId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [mcResult, setMcResult] = useState<string | null>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // Track if user has scrolled away from bottom
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 60;
    setUserScrolledUp(!atBottom);
  };

  useEffect(() => {
    if (!userScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, agentTyping, userScrolledUp]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setUserScrolledUp(false);
  };

  // Group messages by date for date separators
  const messagesWithDates = useMemo(() => {
    const result: { type: "date"; label: string; key: string }[] | { type: "message"; msg: typeof messages[0]; key: string }[] = [];
    const items: ({ type: "date"; label: string; key: string } | { type: "message"; msg: typeof messages[0]; key: string })[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const prev = i > 0 ? messages[i - 1] : null;

      if (!prev || !isSameDay(prev.timestamp, msg.timestamp)) {
        items.push({
          type: "date",
          label: formatDateSeparator(msg.timestamp),
          key: `date-${msg.timestamp}`,
        });
      }
      items.push({ type: "message", msg, key: msg.id });
    }
    return items;
  }, [messages]);

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

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* WhatsApp-style header */}
      <div className="px-4 py-2.5 border-b border-gray-800/60 bg-gray-900/80 flex items-center gap-3">
        <div className="relative">
          <span className="text-2xl">{agentEmoji}</span>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-gray-900" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-100 text-sm">{agentName}</div>
          <div className="text-[11px] text-emerald-400">
            {agentTyping ? "typing..." : "online"}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-950/40 border-b border-red-900/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Messages area with subtle pattern background */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 bg-[radial-gradient(circle_at_20%_50%,rgba(30,40,60,0.3),transparent_70%)]"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6 py-4 bg-gray-900/60 rounded-lg border border-gray-800/40 max-w-xs">
              <p className="text-xs text-gray-500">
                Messages are end-to-end managed by your command center.
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Send a message to start chatting with {agentName}.
              </p>
            </div>
          </div>
        )}

        {messagesWithDates.map((item) => {
          if (item.type === "date") {
            return (
              <div key={item.key} className="flex justify-center my-3">
                <span className="px-3 py-1 bg-gray-800/70 text-gray-400 text-[11px] rounded-md shadow-sm">
                  {item.label}
                </span>
              </div>
            );
          }

          const msg = item.msg;
          const isUser = msg.sender === "user";

          return (
            <div key={item.key} className={`flex ${isUser ? "justify-end" : "justify-start"} mb-1`}>
              <div
                className={`relative max-w-[75%] rounded-lg px-3 py-1.5 shadow-sm ${
                  isUser
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700/40"
                }`}
              >
                {/* Agent name label for agent messages */}
                {!isUser && (
                  <div className="text-[11px] font-medium text-emerald-400 mb-0.5">
                    {agentName}
                  </div>
                )}

                {/* Message content */}
                <div className="prose prose-invert prose-sm max-w-none break-words [&>p]:my-0 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 text-[13.5px] leading-[1.35]">
                  <MarkdownRenderer content={msg.content} />
                  {msg.streaming && (
                    <span className="inline-block w-1 h-3.5 bg-blue-400 animate-pulse ml-0.5 align-middle rounded-sm" />
                  )}
                </div>

                {/* Attachments */}
                {msg.hasAttachments && msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-white/10 space-y-0.5">
                    {msg.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs opacity-80">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span>{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Timestamp + read receipts (WhatsApp style) */}
                <div className={`flex items-center justify-end gap-1 mt-0.5 -mb-0.5 ${isUser ? "text-blue-200/50" : "text-gray-500"}`}>
                  <span className="text-[10px]">{formatMessageTime(msg.timestamp)}</span>
                  {isUser && (
                    <span className="flex items-center">
                      {msg.status === "sending" && (
                        <svg className="w-3.5 h-3.5 text-blue-300/40" fill="none" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" strokeDasharray="6" strokeLinecap="round">
                            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                          </circle>
                        </svg>
                      )}
                      {msg.status === "sent" && (
                        <svg className="w-4 h-3" viewBox="0 0 16 12" fill="none">
                          <path d="M1.5 6.5L5.5 10.5L14.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {msg.status === "read" && (
                        <svg className="w-4 h-3 text-blue-300" viewBox="0 0 20 12" fill="none">
                          <path d="M1.5 6.5L5.5 10.5L14.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5.5 6.5L9.5 10.5L18.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {msg.status === "failed" && (
                        <button
                          onClick={() => handleSend(msg.content, msg.attachments || [])}
                          className="text-red-400 hover:text-red-300 ml-1"
                          title="Tap to retry"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
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
          <div className="flex justify-start mb-1">
            <div className="bg-gray-800 border border-gray-700/40 rounded-lg rounded-tl-none px-3 py-2 shadow-sm">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.6s" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms", animationDuration: "0.6s" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms", animationDuration: "0.6s" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button (WhatsApp style) */}
      {userScrolledUp && (
        <div className="absolute bottom-24 right-6 z-10">
          <button
            onClick={scrollToBottom}
            className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700/50 shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="currentColor" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}

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

      {/* Input area */}
      <div className="px-3 py-2.5 border-t border-gray-800/40 bg-gray-900/50">
        <RichInput
          onSend={handleSend}
          disabled={false}
          placeholder={`Message ${agentName}...`}
        />
      </div>
    </div>
  );
}
