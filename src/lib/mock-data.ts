export interface Agent {
  id: string;
  name: string;
  emoji: string;
  domain: "vorentoe" | "skyward" | "community" | "teaching";
  status: "idle" | "active" | "blocked" | "waiting_for_shannon";
  currentTask: string | null;
  updatedAt: string;
}

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
