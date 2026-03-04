"use client";

import { useState, useEffect, useRef } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import RichInput from "./RichInput";

interface AttachmentFile {
  name: string;
  type: string;
  size: number;
}

interface Message {
  id: string;
  agentId: string;
  sender: "shannon" | "agent";
  message: string;
  timestamp: string;
  hasAttachments?: boolean;
  attachments?: AttachmentFile[];
}

interface ChatWindowProps {
  agentId: string;
  agentName: string;
  agentEmoji: string;
}

export default function ChatWindow({ agentId, agentName, agentEmoji }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [agentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/chat/${agentId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (message: string, attachments: AttachmentFile[]) => {
    setSending(true);
    const tempId = `temp_${Date.now()}`;

    // Optimistic update
    const tempMessage: Message = {
      id: tempId,
      agentId,
      sender: "shannon",
      message,
      timestamp: new Date().toISOString(),
      hasAttachments: attachments.length > 0,
      attachments,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          message,
          attachments,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastMessageId(data.id);

        // Update temp message with real ID
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...msg, id: data.id } : msg
          )
        );
      } else {
        // Remove temp message on failure
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        alert("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
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

  if (loading) {
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
              } rounded-lg px-4 py-3 shadow-lg`}
            >
              {/* Agent header for agent messages */}
              {msg.sender === "agent" && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                  <span className="text-lg">{agentEmoji}</span>
                  <span className="text-sm font-medium text-gray-300">{agentName}</span>
                </div>
              )}

              {/* Message content */}
              <div className="prose prose-invert prose-sm max-w-none">
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

              {/* Timestamp */}
              <div className="mt-2 text-xs opacity-70">
                {formatTimestamp(msg.timestamp)}
                {msg.sender === "shannon" && msg.id === lastMessageId && (
                  <span className="ml-2">✓</span>
                )}
                {msg.sender === "shannon" && sending && msg.id.startsWith("temp_") && (
                  <span className="ml-2 italic">Sending...</span>
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
          disabled={sending}
          placeholder={`Message ${agentName}...`}
        />
      </div>
    </div>
  );
}
