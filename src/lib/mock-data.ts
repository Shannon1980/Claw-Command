export interface Agent {
  id: string;
  name: string;
  emoji: string;
  domain: "vorentoe" | "skyward" | "community" | "teaching";
  status: "idle" | "active" | "blocked" | "waiting_for_shannon";
  currentTask: string | null;
  updatedAt: string;
}

export interface DependencyTask {
  id: string;
  title: string;
  assignedToAgent: string;
  assignedToEmoji: string;
  status: "backlog" | "in_progress" | "blocked" | "done";
  dueDate: string;
}

export const mockAgents: Agent[] = [
  {
    id: "bob",
    name: "Bob",
    emoji: "🤖",
    domain: "vorentoe",
    status: "active",
    currentTask: "Orchestrating Claw Command build",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bertha",
    name: "Bertha",
    emoji: "💼",
    domain: "vorentoe",
    status: "active",
    currentTask: "DHS Border Tech capability statement",
    updatedAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: "veronica",
    name: "Veronica",
    emoji: "🎯",
    domain: "vorentoe",
    status: "waiting_for_shannon",
    currentTask: "MBE certification — awaiting document approval",
    updatedAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: "depa",
    name: "Depa",
    emoji: "📊",
    domain: "vorentoe",
    status: "active",
    currentTask: "Army NETCOM competitive landscape analysis",
    updatedAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: "forge",
    name: "Forge",
    emoji: "⚙️",
    domain: "vorentoe",
    status: "active",
    currentTask: "GovForecast data pipeline architecture",
    updatedAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: "atlas",
    name: "Atlas",
    emoji: "🖥️",
    domain: "vorentoe",
    status: "idle",
    currentTask: null,
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "muse",
    name: "Muse",
    emoji: "🎨",
    domain: "vorentoe",
    status: "idle",
    currentTask: null,
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "peter",
    name: "Peter",
    emoji: "📋",
    domain: "vorentoe",
    status: "active",
    currentTask: "Sprint planning for Week 2",
    updatedAt: new Date(Date.now() - 180000).toISOString(),
  },
  {
    id: "harmony",
    name: "Harmony",
    emoji: "👥",
    domain: "community",
    status: "idle",
    currentTask: null,
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "skylar",
    name: "Skylar",
    emoji: "🌤️",
    domain: "skyward",
    status: "active",
    currentTask: "SEAS IT quarterly status report",
    updatedAt: new Date(Date.now() - 240000).toISOString(),
  },
  {
    id: "sentinel",
    name: "Sentinel",
    emoji: "🛡️",
    domain: "vorentoe",
    status: "idle",
    currentTask: null,
    updatedAt: new Date(Date.now() - 5400000).toISOString(),
  },
];

export const mockDependencies: DependencyTask[] = [
  {
    id: "task-5",
    title: "Approve MBE certification documents",
    assignedToAgent: "Veronica",
    assignedToEmoji: "🎯",
    status: "blocked",
    dueDate: "2026-03-06",
  },
  {
    id: "task-3",
    title: "Review VA proposal pricing",
    assignedToAgent: "Bertha",
    assignedToEmoji: "💼",
    status: "blocked",
    dueDate: "2026-03-08",
  },
  {
    id: "task-7",
    title: "SEAS IT quarterly status report review",
    assignedToAgent: "Skylar",
    assignedToEmoji: "🌤️",
    status: "in_progress",
    dueDate: "2026-03-07",
  },
  {
    id: "task-1",
    title: "Complete 8(a) certification application",
    assignedToAgent: "Veronica",
    assignedToEmoji: "🎯",
    status: "in_progress",
    dueDate: "2026-03-15",
  },
  {
    id: "task-8",
    title: "PTA spring fundraiser planning approval",
    assignedToAgent: "Harmony",
    assignedToEmoji: "👥",
    status: "backlog",
    dueDate: "2026-03-25",
  },
];

export const DOMAIN_COLORS: Record<string, string> = {
  vorentoe: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  skyward: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  community: "bg-green-500/20 text-green-400 border-green-500/30",
  teaching: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export const STATUS_CONFIG: Record<
  string,
  { color: string; label: string; pulse: boolean }
> = {
  idle: { color: "bg-gray-500", label: "Idle", pulse: false },
  active: { color: "bg-green-500", label: "Active", pulse: true },
  blocked: { color: "bg-red-500", label: "Blocked", pulse: false },
  waiting_for_shannon: {
    color: "bg-amber-500",
    label: "Waiting for Shannon",
    pulse: true,
  },
};
