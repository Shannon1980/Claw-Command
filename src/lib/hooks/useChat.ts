import { useState, useCallback, useEffect } from 'react';
import { usePolling } from './usePolling';

export interface AttachmentFile {
  name: string;
  type: string;
  size: number;
}

export interface Message {
  id: string;
  agentId: string;
  sender: 'user' | 'agent'; // Changed from 'shannon' to match DB/API
  content: string;          // Changed from 'message' to match DB/API
  timestamp: string;
  status?: 'sending' | 'sent' | 'failed' | 'read';
  hasAttachments?: boolean;
  attachments?: AttachmentFile[];
}

interface UseChatOptions {
  pollInterval?: number;
}

export function useChat(agentId: string, options: UseChatOptions = {}) {
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  
  // Default to 3s polling
  const { pollInterval = 3000 } = options;

  // Use usePolling hook to fetch backend messages
  // The API returns { messages: Message[] } or just Message[]? 
  // Checking route.ts... it returns NextResponse.json(history), which is array.
  // But wait, the previous code in useChat had `const data = await res.json(); const backendMessages = data.messages || [];`
  // The mock API returned an array directly. 
  // I should check if the new API returns an array or object.
  // Forge's backend usually returns array. I'll assume array for now but handle both.
  
  const { data: backendData, loading, error, refresh } = usePolling<Message[] | { messages: Message[] }>({
    url: `/api/chat/${agentId}`,
    interval: pollInterval,
    enabled: !!agentId
  });

  // Sync backend messages to local state
  useEffect(() => {
    if (!backendData) return;

    const backendMessages = Array.isArray(backendData) ? backendData : (backendData.messages || []);

    setLocalMessages(current => {
      // Find optimistic messages that haven't been confirmed by backend yet
      const pendingMessages = current.filter(m => 
        (m.status === 'sending' || m.status === 'failed') && 
        // Ensure not already in backend list (by ID)
        !backendMessages.some(bm => bm.id === m.id)
      );

      return [...backendMessages, ...pendingMessages];
    });
  }, [backendData]);

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

    // Optimistic update
    setLocalMessages(prev => [...prev, newMessage]);

    try {
      const res = await fetch('/api/chat', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, content, attachments }),
      });

      if (!res.ok) throw new Error('Failed to send');

      const data = await res.json(); 
      
      // Update the specific message with real ID and 'sent' status
      setLocalMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, id: data.messageId || data.id, status: 'sent', timestamp: data.timestamp || m.timestamp } : m
      ));
      
      // Trigger immediate fetch to ensure full sync
      refresh();

    } catch (err) {
      console.error("Send error:", err);
      setLocalMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'failed' } : m
      ));
    }
  }, [agentId, refresh]);

  return {
    messages: localMessages,
    loading: loading && localMessages.length === 0,
    error: error ? error.message : null,
    sendMessage,
  };
}
