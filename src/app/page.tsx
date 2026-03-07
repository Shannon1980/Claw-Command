"use client";

import { useEffect } from "react";
import { useOverviewStore } from "@/lib/stores/overviewStore";
import { useAgentStore } from "@/lib/stores/agentStore";
import { useTaskStore } from "@/lib/stores/taskStore";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  inbox: "bg-gray-600",
  backlog: "bg-gray-500",
  in_progress: "bg-blue-500",
  review: "bg-purple-500",
  quality_review: "bg-indigo-500",
  blocked: "bg-amber-500",
  done: "bg-green-500",
};

export default function OverviewPage() {
  const { stats, health, fetchStats, fetchHealth } = useOverviewStore();
  const { agents, fetchAgents } = useAgentStore();
  const { tasks, fetchTasks } = useTaskStore();

  useEffect(() => {
    fetchStats();
    fetchHealth();
    fetchAgents();
    fetchTasks();
  }, [fetchStats, fetchHealth, fetchAgents, fetchTasks]);

  const agentsOnline = agents.filter((a) => a.status === "active").length;
  const tasksRunning = tasks.filter((t) => t.status === "in_progress").length;
  const tasksByStatus: Record<string, number> = {};
  for (const t of tasks) {
    tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
  }

  const quickActions = [
    { label: "Spawn Agent", href: "/spawn", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
    { label: "View Logs", href: "/logs", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { label: "Task Board", href: "/tasks", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { label: "Memory", href: "/memory", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
    { label: "Pipelines", href: "/orchestration", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
    { label: "Alerts", href: "/alerts", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-lg font-semibold text-gray-100">Overview</h1>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Agents Online" value={agentsOnline} total={agents.length} color="cyan" />
        <StatCard label="Tasks Running" value={tasksRunning} total={tasks.length} color="blue" />
        <StatCard label="Errors (24h)" value={stats?.errors24h ?? 0} color="red" />
        <StatCard label="Audit Events (24h)" value={stats?.auditEvents24h ?? 0} color="purple" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* System Health */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-3">
            System Health
          </h2>
          <div className="space-y-2">
            <HealthRow
              label="Gateway"
              value={health?.gatewayStatus ?? "unknown"}
              indicator={health?.gatewayStatus === "online" ? "green" : "red"}
            />
            {health?.gatewayLatencyMs != null && (
              <HealthRow label="Latency" value={`${health.gatewayLatencyMs}ms`} />
            )}
            {health?.uptime && <HealthRow label="Uptime" value={health.uptime} />}
            {health?.dbSizeMb != null && (
              <HealthRow label="DB Size" value={`${health.dbSizeMb} MB`} />
            )}
          </div>
        </div>

        {/* Tasks by Status */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-3">
            Tasks by Status
          </h2>
          <div className="space-y-2">
            {Object.entries(tasksByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] || "bg-gray-600"}`} />
                  <span className="text-xs text-gray-400 capitalize">
                    {status.replace(/_/g, " ")}
                  </span>
                </div>
                <span className="text-xs font-mono text-gray-300">{count}</span>
              </div>
            ))}
            {Object.keys(tasksByStatus).length === 0 && (
              <p className="text-xs text-gray-600 font-mono">No tasks yet</p>
            )}
          </div>
        </div>

        {/* Agents */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-3">
            Agents
          </h2>
          <div className="space-y-2">
            {agents.slice(0, 8).map((agent) => (
              <div key={agent.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{agent.emoji}</span>
                  <span className="text-xs text-gray-300">{agent.name}</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    agent.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : agent.status === "blocked"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {agent.status}
                </span>
              </div>
            ))}
            {agents.length === 0 && (
              <p className="text-xs text-gray-600 font-mono">No agents registered</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:bg-gray-800/60 hover:border-gray-700 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
              </svg>
              <span className="text-[11px] font-mono text-gray-400">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total?: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    cyan: "text-cyan-400",
    blue: "text-blue-400",
    red: "text-red-400",
    purple: "text-purple-400",
    green: "text-green-400",
  };
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-2xl font-bold font-mono mt-1 ${colorMap[color] || "text-gray-300"}`}>
        {value}
        {total != null && (
          <span className="text-sm text-gray-600 ml-1">/ {total}</span>
        )}
      </p>
    </div>
  );
}

function HealthRow({
  label,
  value,
  indicator,
}: {
  label: string;
  value: string;
  indicator?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-1.5">
        {indicator && (
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              indicator === "green" ? "bg-green-500" : "bg-red-500"
            }`}
          />
        )}
        <span className="text-xs font-mono text-gray-300 capitalize">{value}</span>
      </div>
    </div>
  );
}
