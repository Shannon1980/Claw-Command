export interface ChatMessage {
  id: string;
  agentId: string;
  sender: "user" | "agent";
  content: string;
  timestamp: Date;
}

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  status: "active" | "idle" | "offline";
  lastActivity?: Date;
}

export const agents: Agent[] = [
  { id: "bob", name: "Bob", emoji: "🤖", status: "active", lastActivity: new Date("2026-03-04T18:15:00") },
  { id: "bertha", name: "Bertha", emoji: "💼", status: "active", lastActivity: new Date("2026-03-04T17:30:00") },
  { id: "veronica", name: "Veronica", emoji: "🎯", status: "active", lastActivity: new Date("2026-03-04T16:45:00") },
  { id: "depa", name: "Depa", emoji: "📊", status: "idle", lastActivity: new Date("2026-03-04T14:20:00") },
  { id: "forge", name: "Forge", emoji: "⚙️", status: "active", lastActivity: new Date("2026-03-04T18:00:00") },
  { id: "atlas", name: "Atlas", emoji: "🖥️", status: "active", lastActivity: new Date("2026-03-04T18:30:00") },
  { id: "muse", name: "Muse", emoji: "🎨", status: "idle", lastActivity: new Date("2026-03-04T12:00:00") },
  { id: "peter", name: "Peter", emoji: "📋", status: "active", lastActivity: new Date("2026-03-04T15:30:00") },
  { id: "harmony", name: "Harmony", emoji: "👥", status: "idle", lastActivity: new Date("2026-03-03T16:00:00") },
  { id: "skylar", name: "Skylar", emoji: "🌤️", status: "active", lastActivity: new Date("2026-03-04T17:00:00") },
  { id: "sentinel", name: "Sentinel", emoji: "🛡️", status: "idle", lastActivity: new Date("2026-03-04T11:00:00") },
];

export const mockChatHistory: Record<string, ChatMessage[]> = {
  bob: [
    {
      id: "1",
      agentId: "bob",
      sender: "agent",
      content: "Good morning! I've reviewed the overnight activity. The dashboard is coming together nicely. Atlas is working on the chat and calendar features now.",
      timestamp: new Date("2026-03-04T09:00:00"),
    },
    {
      id: "2",
      agentId: "bob",
      sender: "user",
      content: "Great! How's the overall progress on Claw Command?",
      timestamp: new Date("2026-03-04T09:05:00"),
    },
    {
      id: "3",
      agentId: "bob",
      sender: "agent",
      content: "We're on track. Pipeline and Brief are live. Forge just deployed the activity feed. Once Atlas finishes the chat and calendar views, we'll have core command center functionality complete.",
      timestamp: new Date("2026-03-04T09:06:00"),
    },
    {
      id: "4",
      agentId: "bob",
      sender: "user",
      content: "Perfect. Keep me posted on any blockers.",
      timestamp: new Date("2026-03-04T09:10:00"),
    },
    {
      id: "5",
      agentId: "bob",
      sender: "agent",
      content: "Will do. Focus on your Skyward work—I'll handle coordination here.",
      timestamp: new Date("2026-03-04T09:11:00"),
    },
  ],
  bertha: [
    {
      id: "1",
      agentId: "bertha",
      sender: "agent",
      content: "I've been tracking the DHS Border Tech opportunity. It's a great fit for Vorentoe's AI/ML capabilities and our EDWOSB status gives us a competitive edge.",
      timestamp: new Date("2026-03-04T10:30:00"),
    },
    {
      id: "2",
      agentId: "bertha",
      sender: "user",
      content: "What's the timeline on that RFP?",
      timestamp: new Date("2026-03-04T10:45:00"),
    },
    {
      id: "3",
      agentId: "bertha",
      sender: "agent",
      content: "Response due April 15. I'm drafting our capability statement now. We should schedule a strategy session with Depa to review competitor positioning.",
      timestamp: new Date("2026-03-04T10:47:00"),
    },
    {
      id: "4",
      agentId: "bertha",
      sender: "user",
      content: "Good. Let's aim for next Wednesday.",
      timestamp: new Date("2026-03-04T11:00:00"),
    },
    {
      id: "5",
      agentId: "bertha",
      sender: "agent",
      content: "Added to calendar. I'll have the competitive analysis ready by Tuesday.",
      timestamp: new Date("2026-03-04T11:01:00"),
    },
  ],
  veronica: [
    {
      id: "1",
      agentId: "veronica",
      sender: "agent",
      content: "Update on MBE certification: application submitted to MDOT. We should hear back within 45-60 days.",
      timestamp: new Date("2026-03-04T14:00:00"),
    },
    {
      id: "2",
      agentId: "veronica",
      sender: "user",
      content: "Excellent! What about the 8(a) application?",
      timestamp: new Date("2026-03-04T14:15:00"),
    },
    {
      id: "3",
      agentId: "veronica",
      sender: "agent",
      content: "Still gathering financials. SBA requires 3 years of tax returns. I'm coordinating with your accountant to get everything certified.",
      timestamp: new Date("2026-03-04T14:16:00"),
    },
    {
      id: "4",
      agentId: "veronica",
      sender: "user",
      content: "Let me know if you need anything from me.",
      timestamp: new Date("2026-03-04T14:20:00"),
    },
    {
      id: "5",
      agentId: "veronica",
      sender: "agent",
      content: "Will do. Should have the full package ready for review by end of month.",
      timestamp: new Date("2026-03-04T14:21:00"),
    },
  ],
};

export function getAgentChatHistory(agentId: string): ChatMessage[] {
  return mockChatHistory[agentId] || [];
}

export function getSortedAgents(): Agent[] {
  return [...agents].sort((a, b) => {
    // Active agents first
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    
    // Then by last activity
    if (a.lastActivity && b.lastActivity) {
      return b.lastActivity.getTime() - a.lastActivity.getTime();
    }
    
    return 0;
  });
}
