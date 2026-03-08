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

const PRIORITY_ORDER = ["blocked", "review", "quality_review", "in_progress", "inbox", "backlog"];

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
  const agentsBlocked = agents.filter((a) => a.status === "blocked").length;
  const agentsWaiting = agents.filter((a) => a.status === "waiting_for_shannon").length;
  const tasksRunning = tasks.filter((t) => t.status === "in_progress").length;
  const tasksBlocked = tasks.filter((t) => t.status === "blocked").length;
  const tasksNeedingReview = tasks.filter(
    (t) => t.status === "review" || t.status === "quality_review"
  ).length;
  const tasksNeedingApproval = tasks.filter((t) => t.dependsOnShannon === true).length;
  const tasksByStatus: Record<string, number> = {};
  for (const t of tasks) {
    tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
  }

  // Items needing Shannon's attention, sorted by urgency
  const attentionItems: { label: string; count: number; href: string; color: string; urgency: number }[] = [];
  if (agentsWaiting > 0) attentionItems.push({ label: "Agents waiting for you", count: agentsWaiting, href: "/agents", color: "text-purple-400", urgency: 1 });
  if (tasksNeedingApproval > 0) attentionItems.push({ label: "Tasks needing approval", count: tasksNeedingApproval, href: "/tasks", color: "text-amber-400", urgency: 2 });
  if (tasksNeedingReview > 0) attentionItems.push({ label: "Tasks ready for review", count: tasksNeedingReview, href: "/tasks", color: "text-purple-400", urgency: 3 });
  if (tasksBlocked > 0) attentionItems.push({ label: "Blocked tasks", count: tasksBlocked, href: "/tasks", color: "text-red-400", urgency: 4 });
  if (agentsBlocked > 0) attentionItems.push({ label: "Blocked agents", count: agentsBlocked, href: "/agents", color: "text-amber-400", urgency: 5 });
  if ((stats?.errors24h ?? 0) > 0) attentionItems.push({ label: "Errors in last 24h", count: stats?.errors24h ?? 0, href: "/monitoring?tab=logs", color: "text-red-400", urgency: 6 });
  attentionItems.sort((a, b) => a.urgency - b.urgency);

  const sortedStatuses = Object.entries(tasksByStatus).sort(([a], [b]) => {
    const ai = PRIORITY_ORDER.indexOf(a);
    const bi = PRIORITY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const quickActions = [
    { label: "Daily Brief", href: "/daily-news-brief", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16v6M17 16v6m3-13V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2z" },
    { label: "Task Board", href: "/tasks", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { label: "Deals", href: "/deals", icon: "M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0-4l4-4m-4 4l-4-4" },
    { label: "Opp Engine", href: "/opportunity-engine", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" },
    { label: "Certifications", href: "/certifications", icon: "M12 14l9-5-9-5-9 5 9 5z" },
    { label: "Memory", href: "/memory", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
    { label: "Skills", href: "/skills", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
    { label: "Agents", href: "/agents", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
    { label: "Pipelines", href: "/orchestration", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
    { label: "Monitoring", href: "/monitoring", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { label: "Alerts", href: "/alerts", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
    { label: "Spawn Agent", href: "/spawn", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header row with greeting + daily brief link */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">
            Command Overview
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5" suppressHydrationWarning>
            {agents.length} agents &middot; {tasks.length} tasks &middot; {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
        <Link
          href="/daily-news-brief"
          className="px-3 py-1.5 text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors shrink-0"
        >
          Open Daily Brief
        </Link>
      </div>

      {/* Attention Banner - only shows when there are actionable items */}
      {attentionItems.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
          <h2 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2.5">
            Needs Your Attention
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {attentionItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between px-3 py-2 bg-gray-900/60 border border-gray-800 rounded-lg hover:bg-gray-800/60 hover:border-gray-700 transition-colors"
              >
                <span className="text-xs text-gray-300">{item.label}</span>
                <span className={`text-sm font-bold font-mono ${item.color}`}>
                  {item.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top Stats - compact 6-column row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Agents Online" value={agentsOnline} total={agents.length} color="cyan" />
        <StatCard label="Tasks Running" value={tasksRunning} total={tasks.length} color="blue" />
        <StatCard label="In Review" value={tasksNeedingReview} color="purple" />
        <StatCard label="Blocked" value={tasksBlocked + agentsBlocked} color="amber" />
        <StatCard label="Errors (24h)" value={stats?.errors24h ?? 0} color="red" />
        <StatCard label="Audit Events" value={stats?.auditEvents24h ?? 0} color="gray" />
      </div>

      {/* Main Grid - 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Agents sorted by who needs attention first */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                Agent Status
              </h2>
              <Link href="/agents" className="text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors">
                View all
              </Link>
            </div>
            <div className="space-y-1.5">
              {agents
                .filter((a) => !a.retiredAt)
                .sort((a, b) => {
                  const priority: Record<string, number> = { waiting_for_shannon: 0, blocked: 1, active: 2, idle: 3 };
                  return (priority[a.status] ?? 4) - (priority[b.status] ?? 4);
                })
                .slice(0, 10)
                .map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}`}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-800/40 transition-colors -mx-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm shrink-0">{agent.emoji}</span>
                      <span className="text-xs text-gray-300 truncate">{agent.name}</span>
                      {agent.taskTitle && (
                        <span className="text-[10px] text-gray-500 truncate hidden sm:inline">
                          - {agent.taskTitle}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                        agent.status === "active"
                          ? "bg-green-500/20 text-green-400"
                          : agent.status === "waiting_for_shannon"
                            ? "bg-purple-500/20 text-purple-400"
                            : agent.status === "blocked"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-gray-800 text-gray-500"
                      }`}
                    >
                      {agent.status === "waiting_for_shannon" ? "needs you" : agent.status}
                    </span>
                  </Link>
                ))}
              {agents.length === 0 && (
                <p className="text-xs text-gray-600 font-mono">No agents registered</p>
              )}
            </div>
          </div>

          {/* System Health - 2-col grid for compactness */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-3">
              System Health
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
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
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Tasks by Status with visual bars, sorted by urgency */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                Tasks by Status
              </h2>
              <Link href="/tasks" className="text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors">
                Open board
              </Link>
            </div>
            <div className="space-y-1.5">
              {sortedStatuses.map(([status, count]) => {
                const total = tasks.length || 1;
                const pct = (count / total) * 100;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[status] || "bg-gray-600"}`} />
                      <span className="text-xs text-gray-400 capitalize truncate">
                        {status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${STATUS_COLORS[status] || "bg-gray-600"}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-300 w-6 text-right">{count}</span>
                  </div>
                );
              })}
              {sortedStatuses.length === 0 && (
                <p className="text-xs text-gray-600 font-mono">No tasks yet</p>
              )}
            </div>
          </div>

          {/* Inline preview of tasks that need action */}
          {(tasksBlocked > 0 || tasksNeedingReview > 0) && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-3">
                Tasks Needing Action
              </h2>
              <div className="space-y-1.5">
                {tasks
                  .filter((t) => t.status === "blocked" || t.status === "review" || t.status === "quality_review")
                  .slice(0, 6)
                  .map((task) => (
                    <div key={task.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-800/40 -mx-2">
                      <span className="text-xs text-gray-300 truncate flex-1 mr-2">{task.title}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        task.status === "blocked"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-purple-500/20 text-purple-400"
                      }`}>
                        {task.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - reordered for Shannon's workflow priorities */}
      <div>
        <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-1.5 p-3 bg-gray-900/50 border border-gray-800 rounded-lg hover:bg-gray-800/60 hover:border-gray-700 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
              </svg>
              <span className="text-[10px] font-mono text-gray-400 text-center leading-tight">{action.label}</span>
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
    amber: "text-amber-400",
    gray: "text-gray-400",
  };
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-xl font-bold font-mono mt-0.5 ${colorMap[color] || "text-gray-300"}`}>
        {value}
        {total != null && (
          <span className="text-xs text-gray-600 ml-1">/ {total}</span>
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
