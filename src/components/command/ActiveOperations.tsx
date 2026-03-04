"use client";

import { Agent, mockAgents } from "@/lib/mock-data";
import AgentCard from "./AgentCard";

const DOMAIN_ORDER = ["vorentoe", "skyward", "community", "teaching"] as const;
const DOMAIN_LABELS: Record<string, string> = {
  vorentoe: "VORENTOE LLC",
  skyward: "SKYWARD IT",
  community: "COMMUNITY",
  teaching: "TEACHING",
};

export default function ActiveOperations() {
  const grouped = DOMAIN_ORDER.map((domain) => ({
    domain,
    label: DOMAIN_LABELS[domain],
    agents: mockAgents.filter((a) => a.domain === domain),
  })).filter((g) => g.agents.length > 0);

  const activeCount = mockAgents.filter((a) => a.status === "active").length;
  const blockedCount = mockAgents.filter(
    (a) => a.status === "blocked" || a.status === "waiting_for_shannon"
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="flex items-center gap-6 text-sm font-mono">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-gray-400">
            {activeCount} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-gray-400">
            {blockedCount} need attention
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-gray-500" />
          <span className="text-gray-400">
            {mockAgents.length} total
          </span>
        </div>
      </div>

      {/* Agent Groups */}
      {grouped.map(({ domain, label, agents }) => (
        <div key={domain}>
          <h3 className="text-xs font-mono font-bold text-gray-500 tracking-widest uppercase mb-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-gray-800" />
            {label}
            <span className="h-px flex-1 bg-gray-800" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
