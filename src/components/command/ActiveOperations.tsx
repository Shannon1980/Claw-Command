"use client";

import { useEffect, useState } from "react";
import { DOMAIN_COLORS, STATUS_CONFIG } from "@/lib/mock-data";
import AgentCard from "./AgentCard";

interface Agent {
  id: string;
  name: string;
  emoji: string;
  domain: string;
  status: string;
  current_task_id: string | null;
  updated_at: string;
}

const DOMAIN_ORDER = ["vorentoe", "skyward", "community", "teaching"] as const;
const DOMAIN_LABELS: Record<string, string> = {
  vorentoe: "VORENTOE LLC",
  skyward: "SKYWARD IT",
  community: "COMMUNITY",
  teaching: "TEACHING",
};

export default function ActiveOperations() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data = await res.json();
          setAgents(data);
        }
      } catch (error) {
        console.error("Failed to fetch agents:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  const grouped = DOMAIN_ORDER.map((domain) => ({
    domain,
    label: DOMAIN_LABELS[domain],
    agents: agents.filter((a) => a.domain === domain),
  })).filter((g) => g.agents.length > 0);

  const activeCount = agents.filter((a) => a.status === "active").length;
  const blockedCount = agents.filter(
    (a) => a.status === "blocked" || a.status === "waiting_for_shannon"
  ).length;

  if (loading) {
    return (
      <div className="text-sm text-gray-500 font-mono animate-pulse">
        Loading agents...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="flex items-center gap-6 text-sm font-mono">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-gray-400">{activeCount} active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-gray-400">{blockedCount} need attention</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-gray-500" />
          <span className="text-gray-400">{agents.length} total</span>
        </div>
      </div>

      {/* Agent Groups */}
      {grouped.map(({ domain, label, agents: domainAgents }) => (
        <div key={domain}>
          <h3 className="text-xs font-mono font-bold text-gray-500 tracking-widest uppercase mb-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-gray-800" />
            {label}
            <span className="h-px flex-1 bg-gray-800" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {domainAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={{
                  id: agent.id,
                  name: agent.name,
                  emoji: agent.emoji,
                  domain: agent.domain as "vorentoe" | "skyward" | "community" | "teaching",
                  status: agent.status as "idle" | "active" | "blocked" | "waiting_for_shannon",
                  currentTask: agent.current_task_id,
                  updatedAt: agent.updated_at,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
