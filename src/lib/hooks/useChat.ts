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
}

export function useChat(agentId: string) {
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${agentId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
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

      setLocalMessages(current => {
        const pendingMessages = current.filter(m =>
          (m.status === 'sending' || m.status === 'failed') &&
          !backendMessages.some(bm => bm.id === m.id)
        );
        return [...backendMessages, ...pendingMessages];
      });
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [agentId, fetchMessages]);

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

      setLocalMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, id: data.messageId || data.id, status: 'sent', timestamp: data.timestamp || m.timestamp } : m
      ));

      fetchMessages();
    } catch (err) {
      console.error("Send error:", err);
      setLocalMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, status: 'failed' } : m
      ));
    }
  }, [agentId, fetchMessages]);

  return {
    messages: localMessages,
    loading: loading && localMessages.length === 0,
    error,
    sendMessage,
  };
}
