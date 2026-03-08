import { useState, useCallback, useEffect, useRef } from 'react';

export interface AttachmentFile {
  name: string;
  type: string;
  size: number;
}

export interface Message {
  id: string;
  agentId: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'failed' | 'read';
  hasAttachments?: boolean;
  attachments?: AttachmentFile[];
  streaming?: boolean;
}

export function useChat(agentId: string) {
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentTyping, setAgentTyping] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const disposed = useRef(false);

  // Fetch initial message history once
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${agentId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      if (disposed.current) return;
      const data = await res.json();
      if (disposed.current) return;
      const raw = Array.isArray(data) ? data : (data.messages || []);
      const backendMessages: Message[] = (raw as unknown[]).map((m: unknown) => {
        const r = m as Record<string, unknown>;
        return {
          id: String(r.id ?? ""),
          agentId: String(r.agentId ?? ""),
          sender: (r.sender === "shannon" ? "user" : (r.sender || "agent")) as "user" | "agent",
          content: String(r.content ?? r.message ?? ""),
          timestamp: String(r.timestamp ?? new Date().toISOString()),
          status: (r.status ?? "sent") as Message["status"],
          hasAttachments: r.hasAttachments as boolean | undefined,
          attachments: r.attachments as AttachmentFile[] | undefined,
        };
      });
      setLocalMessages(backendMessages);
      setError(null);
    } catch (err) {
      if (!disposed.current) setError((err as Error).message);
    } finally {
      if (!disposed.current) setLoading(false);
    }
  }, [agentId]);

  // Connect to SSE stream for real-time updates
  const connectSSE = useCallback(() => {
    if (disposed.current) return;

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = new EventSource(`/api/chat/stream/${agentId}`);
    esRef.current = es;

    // New message from user or agent (final)
    es.addEventListener("new_message", (event: MessageEvent) => {
      if (disposed.current) return;
      try {
        const data = JSON.parse(event.data);
        const msg = data.message;
        if (!msg) return;

        const newMessage: Message = {
          id: msg.id,
          agentId: msg.agentId,
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp,
          status: msg.status || 'sent',
        };

        setLocalMessages(prev => {
          // Replace streaming placeholder or temp message, or append
          const existing = prev.findIndex(m =>
            m.id === newMessage.id ||
            (m.streaming && m.sender === 'agent')
          );
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newMessage;
            return updated;
          }
          // Don't duplicate if already present
          if (prev.some(m => m.id === newMessage.id)) return prev;
          // Replace temp user message if content matches
          if (newMessage.sender === 'user') {
            const tempIdx = prev.findIndex(m =>
              m.status === 'sending' && m.content === newMessage.content
            );
            if (tempIdx >= 0) {
              const updated = [...prev];
              updated[tempIdx] = newMessage;
              return updated;
            }
          }
          return [...prev, newMessage];
        });

        if (newMessage.sender === 'agent') {
          setAgentTyping(false);
        }
      } catch {
        // ignore parse errors
      }
    });

    // Agent is typing
    es.addEventListener("typing_start", () => {
      if (!disposed.current) setAgentTyping(true);
    });

    es.addEventListener("typing_end", () => {
      if (!disposed.current) setAgentTyping(false);
    });

    // Streaming tokens from agent response
    es.addEventListener("chat_stream", (event: MessageEvent) => {
      if (disposed.current) return;
      try {
        const data = JSON.parse(event.data);
        const { messageId, content } = data;
        if (!messageId || !content) return;

        setAgentTyping(false); // Switch from typing dots to streaming text

        setLocalMessages(prev => {
          const existing = prev.findIndex(m => m.id === messageId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = {
              ...updated[existing],
              content,
              streaming: true,
            };
            return updated;
          }
          // Create a new streaming message
          return [...prev, {
            id: messageId,
            agentId,
            sender: 'agent' as const,
            content,
            timestamp: new Date().toISOString(),
            status: 'sent' as const,
            streaming: true,
          }];
        });
      } catch {
        // ignore
      }
    });

    es.addEventListener("connected", () => {
      retryCount.current = 0;
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Don't reconnect if disposed
      if (disposed.current) return;
      // Exponential backoff: 1s, 2s, 4s, 8s, max 15s
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 15000);
      retryCount.current++;
      reconnectTimer.current = setTimeout(connectSSE, delay);
    };
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    disposed.current = false;
    setLoading(true);
    fetchMessages();
    connectSSE();
    return () => {
      disposed.current = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [agentId, fetchMessages, connectSSE]);

  const sendMessage = useCallback(async (content: string, attachments: AttachmentFile[] = []) => {
    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      agentId,
      sender: 'user',
      content,
      timestamp: new Date().toISOString(),
      status: 'sending',
      hasAttachments: attachments.length > 0,
      attachments,
    };

    setLocalMessages(prev => [...prev, newMessage]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, content, attachments }),
      });

      if (!res.ok) throw new Error('Failed to send');

      const data = await res.json();

      // Update temp message with real ID
      setLocalMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, id: data.messageId || data.id, status: 'sent', timestamp: data.timestamp || m.timestamp } : m
      ));

      // Add the agent reply from the response directly so the chat
      // works even when SSE events cannot cross serverless boundaries.
      if (data.agentReply) {
        const reply = data.agentReply;
        setLocalMessages(prev => {
          // Don't duplicate if SSE already delivered it
          if (prev.some(m => m.id === reply.id)) return prev;
          // Replace any streaming placeholder
          const streamIdx = prev.findIndex(m => m.streaming && m.sender === 'agent');
          if (streamIdx >= 0) {
            const updated = [...prev];
            updated[streamIdx] = {
              id: reply.id,
              agentId: reply.agentId,
              sender: 'agent',
              content: reply.content,
              timestamp: reply.timestamp,
              status: reply.status || 'sent',
            };
            return updated;
          }
          return [...prev, {
            id: reply.id,
            agentId: reply.agentId,
            sender: 'agent',
            content: reply.content,
            timestamp: reply.timestamp,
            status: reply.status || 'sent',
          }];
        });
        setAgentTyping(false);
      }
    } catch (err) {
      console.error("Send error:", err);
      setLocalMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, status: 'failed' } : m
      ));
    }
  }, [agentId]);

  return {
    messages: localMessages,
    loading: loading && localMessages.length === 0,
    error,
    sendMessage,
    agentTyping,
  };
}
