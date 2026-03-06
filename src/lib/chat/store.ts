/**
 * In-memory chat message store.
 * Used when database is unavailable so chat still works.
 */

export interface StoredMessage {
  id: string;
  agentId: string;
  sender: "user" | "agent";
  content: string;
  timestamp: string;
  status: string;
}

const store = new Map<string, StoredMessage[]>();

export function addMessage(msg: Omit<StoredMessage, "id" | "timestamp" | "status">): StoredMessage {
  const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const timestamp = new Date().toISOString();
  const full: StoredMessage = { ...msg, id, timestamp, status: "sent" };
  const list = store.get(msg.agentId) ?? [];
  list.push(full);
  store.set(msg.agentId, list);
  return full;
}

export function getMessages(agentId: string): StoredMessage[] {
  return store.get(agentId) ?? [];
}
