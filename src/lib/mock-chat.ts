export interface ChatMessage {
  id: string;
  agentId: string;
  sender: "user" | "agent";
  content: string;
  timestamp: Date;
}
