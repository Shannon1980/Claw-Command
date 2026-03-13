"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOverviewStore } from "@/lib/stores/overviewStore";
import { useAgentStore } from "@/lib/stores/agentStore";
import { useTaskStore } from "@/lib/stores/taskStore";
import { useGatewayContext } from "@/lib/contexts/GatewayContext";

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
  const gateway = useGatewayContext();

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
  const gatewayConnection = gateway.state.connection;
  const gatewayMetrics = gateway.state.metrics;

  const [isCheckingGateway, setIsCheckingGateway] = useState(false);
  const [gatewayCheckNote, setGatewayCheckNote] = useState<string | null>(null);
  const [lastSuccessfulGatewayCheck, setLastSuccessfulGatewayCheck] = useState<string | null>(null);
  const [gatewayCheckFailureStreak, setGatewayCheckFailureStreak] = useState(0);
  const [gatewayCopyNote, setGatewayCopyNote] = useState<string | null>(null);

  const gatewayLastUpdate = gateway.state.lastUpdate?.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const gatewayDiagnosticsText = useMemo(
    () =>
      [
        `Gateway connection: ${gatewayConnection}`,
        `Gateway last update: ${gatewayLastUpdate ?? "--:--:--"}`,
        `Gateway active agents: ${gatewayMetrics.activeAgents}`,
        `Gateway queue length: ${gatewayMetrics.queueLength}`,
        `Gateway total tokens: ${gatewayMetrics.totalTokens}`,
        `Last successful manual check: ${lastSuccessfulGatewayCheck ?? "none"}`,
        `Failure streak: ${gatewayCheckFailureStreak}`,
        `Error code: ${gateway.state.error?.code ?? "none"}`,
        `Error message: ${gateway.state.error?.message ?? "none"}`,
      ].join("\n"),
    [
      gatewayConnection,
      gatewayLastUpdate,
      gatewayMetrics.activeAgents,
      gatewayMetrics.queueLength,
      gatewayMetrics.totalTokens,
      lastSuccessfulGatewayCheck,
      gatewayCheckFailureStreak,
      gateway.state.error?.code,
      gateway.state.error?.message,
    ]
  );

  const tasksByStatus: Record<string, number> = {};
  for (const t of tasks) {
    tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
  }

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

  const actionTasks = tasks
    .filter((t) => t.status === "blocked" || t.status === "review" || t.status === "quality_review")
    .sort((a, b) => {
      const rank: Record<string, number> = { blocked: 0, review: 1, quality_review: 2 };
      return (rank[a.status] ?? 3) - (rank[b.status] ?? 3);
    })
    .slice(0, 8);

  const now = Date.now();
  const shannonNext24hTasks = tasks
    .filter((t) => {
      if (!t.dependsOnShannon || t.status === "done") return false;
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate).getTime();
      if (Number.isNaN(due)) return false;
      return due >= now && due <= now + 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return ad - bd;
    });

  const runGatewayCheckNow = async () => {
    if (isCheckingGateway) return;
    setIsCheckingGateway(true);
    setGatewayCheckNote(null);

    try {
      const res = await fetch("/api/gateway/status", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      gateway.updateMetrics(data.metrics ?? gateway.state.metrics);

      if (data.agents) {
        Object.entries(data.agents).forEach(([agentId, status]) => {
          gateway.updateAgentStatus(agentId, status as any);
        });
      }

      gateway.setConnectionStatus(data.connected ? "connected" : "disconnected");
      setGatewayCheckFailureStreak(0);
      setLastSuccessfulGatewayCheck(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setGatewayCheckNote(data.connected ? "Gateway check complete: connected" : "Gateway check complete: offline");
    } catch (err) {
      gateway.setConnectionStatus("error", {
        code: "MANUAL_CHECK_FAILED",
        message: err instanceof Error ? err.message : "Manual gateway check failed",
      });
      setGatewayCheckFailureStreak((prev) => prev + 1);
      setGatewayCheckNote("Gateway check failed. See diagnostics below.");
    } finally {
      setIsCheckingGateway(false);
    }
  };

  const copyGatewayDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(gatewayDiagnosticsText);
      setGatewayCopyNote("Diagnostics copied to clipboard.");
    } catch {
      setGatewayCopyNote("Copy failed. Clipboard permissions may be blocked.");
    }
  };

  const exportGatewayDiagnostics = () => {
    const blob = new Blob([`${gatewayDiagnosticsText}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `gateway-diagnostics-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setGatewayCopyNote("Diagnostics exported as .txt file.");
  };

  const quickActions = [
    { label: "Task Board", href: "/tasks" },
    { label: "Daily Brief", href: "/daily-news-brief" },
    { label: "Agents", href: "/agents" },
    { label: "Deals", href: "/deals" },
    { label: "Opp Engine", href: "/opportunity-engine" },
    { label: "Monitoring", href: "/monitoring" },
    { label: "Certifications", href: "/certifications" },
    { label: "Spawn Agent", href: "/spawn" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Command Overview</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5" suppressHydrationWarning>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} · {agents.length} agents · {tasks.length} tasks
          </p>
        </div>
        <Link
          href="/daily-news-brief"
          className="px-3 py-1.5 text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors shrink-0"
        >
          Open Daily Brief
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Agents Online" value={agentsOnline} total={agents.length} color="cyan" />
        <StatCard label="Tasks Running" value={tasksRunning} total={tasks.length} color="blue" />
        <StatCard label="Needs Review" value={tasksNeedingReview} color="purple" />
        <StatCard label="Blocked" value={tasksBlocked + agentsBlocked} color="amber" />
        <StatCard label="Errors (24h)" value={stats?.errors24h ?? 0} color="red" />
        <StatCard label="Audit Events" value={stats?.auditEvents24h ?? 0} color="gray" />
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-mono font-bold text-blue-300 uppercase tracking-wider">
            Needs Shannon (next 24h)
          </h2>
          <Link
            href="/tasks"
            className="text-[11px] font-mono text-blue-300 hover:text-blue-200 transition-colors"
          >
            Open task board →
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-[auto,1fr] gap-4 items-start">
          <div className="rounded-lg border border-blue-500/30 bg-gray-950/60 px-4 py-3 min-w-28 text-center">
            <p className="text-[11px] font-mono text-blue-300 uppercase tracking-wider">Count</p>
            <p className="text-3xl font-semibold text-gray-100 mt-1">{shannonNext24hTasks.length}</p>
          </div>

          <div className="space-y-2">
            {shannonNext24hTasks.length === 0 ? (
              <p className="text-xs text-gray-400">No Shannon-dependent tasks due in the next 24 hours.</p>
            ) : (
              shannonNext24hTasks.slice(0, 5).map((task) => (
                <Link
                  key={task.id}
                  href="/tasks"
                  className="block px-3 py-2 rounded border border-gray-800 bg-gray-900/60 hover:bg-gray-800/60 transition-colors"
                >
                  <p className="text-xs text-gray-200 truncate">{task.title}</p>
                  <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                    Due {task.dueDate ? new Date(task.dueDate).toLocaleString() : "TBD"}
                  </p>
                </Link>
              ))
            )}
            {shannonNext24hTasks.length > 5 && (
              <p className="text-[11px] text-gray-500 font-mono">
                +{shannonNext24hTasks.length - 5} more due soon
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Focus Now</h2>
          {attentionItems.length > 0 && (
            <span className="text-[11px] text-amber-300 font-mono">
              {attentionItems.reduce((sum, item) => sum + item.count, 0)} actionable items
            </span>
          )}
        </div>
        {attentionItems.length > 0 ? (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {attentionItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between px-3 py-2 bg-gray-900/60 border border-gray-800 rounded-lg hover:bg-gray-800/60 hover:border-gray-700 transition-colors"
              >
                <span className="text-xs text-gray-300">{item.label}</span>
                <span className={`text-sm font-bold font-mono ${item.color}`}>{item.count}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-green-300">No urgent blockers. You are clear to focus on planned work.</p>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr_0.9fr] gap-4">
        <div className="space-y-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Tasks Needing Action</h2>
              <Link href="/tasks" className="text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors">Open board</Link>
            </div>
            {actionTasks.length > 0 ? (
              <div className="space-y-1.5">
                {actionTasks.map((task) => (
                  <Link
                    key={task.id}
                    href="/tasks"
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-800/40 -mx-2 transition-colors"
                  >
                    <span className="text-xs text-gray-300 truncate flex-1 mr-2">{task.title}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                      task.status === "blocked" ? "bg-amber-500/20 text-amber-400" : "bg-purple-500/20 text-purple-400"
                    }`}>
                      {task.status.replace(/_/g, " ")}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No blocked or review tasks right now.</p>
            )}
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Agent Status</h2>
              <Link href="/agents" className="text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors">View all</Link>
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
                        <span className="text-[10px] text-gray-500 truncate hidden sm:inline">- {agent.taskTitle}</span>
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
              {agents.length === 0 && <p className="text-xs text-gray-600 font-mono">No agents registered</p>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-3">Tasks by Status</h2>
            <div className="space-y-1.5">
              {sortedStatuses.map(([status, count]) => {
                const total = tasks.length || 1;
                const pct = (count / total) * 100;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[status] || "bg-gray-600"}`} />
                      <span className="text-xs text-gray-400 capitalize truncate">{status.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${STATUS_COLORS[status] || "bg-gray-600"}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                    <span className="text-xs font-mono text-gray-300 w-6 text-right">{count}</span>
                  </div>
                );
              })}
              {sortedStatuses.length === 0 && <p className="text-xs text-gray-600 font-mono">No tasks yet</p>}
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-3">System Health</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <HealthRow
                label="Gateway"
                value={health?.gatewayStatus ?? "unknown"}
                indicator={health?.gatewayStatus === "online" ? "green" : "red"}
              />
              {health?.gatewayLatencyMs != null && <HealthRow label="Latency" value={`${health.gatewayLatencyMs}ms`} />}
              {health?.uptime && <HealthRow label="Uptime" value={health.uptime} />}
              {health?.dbSizeMb != null && <HealthRow label="DB Size" value={`${health.dbSizeMb} MB`} />}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="px-2.5 py-2 text-xs text-gray-300 bg-gray-950/60 border border-gray-800 rounded-md hover:bg-gray-800/70 hover:border-gray-700 transition-colors"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Gateway</h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                gatewayConnection === "connected"
                  ? "bg-green-500/15 text-green-300"
                  : gatewayConnection === "reconnecting"
                    ? "bg-amber-500/15 text-amber-300"
                    : gatewayConnection === "error"
                      ? "bg-red-500/15 text-red-300"
                      : "bg-gray-800 text-gray-400"
              }`}>
                {gatewayConnection}
              </span>
            </div>

            <div className="space-y-1 text-xs text-gray-400 font-mono">
              <p>Active agents: <span className="text-gray-200">{gatewayMetrics.activeAgents}</span></p>
              <p>Queue: <span className="text-gray-200">{gatewayMetrics.queueLength}</span></p>
              <p>Tokens: <span className="text-gray-200">{gatewayMetrics.totalTokens}</span></p>
              <p>Updated: <span className="text-gray-200">{gatewayLastUpdate ?? "--:--:--"}</span></p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={runGatewayCheckNow}
                disabled={isCheckingGateway}
                className="text-[11px] font-mono px-2.5 py-1 rounded border border-gray-700 text-gray-300 hover:text-gray-100 hover:border-gray-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCheckingGateway ? "Checking…" : "Check Now"}
              </button>
              <button
                onClick={copyGatewayDiagnostics}
                className="text-[11px] font-mono px-2.5 py-1 rounded border border-gray-700 text-gray-300 hover:text-gray-100 hover:border-gray-500"
              >
                Copy
              </button>
              <button
                onClick={exportGatewayDiagnostics}
                className="text-[11px] font-mono px-2.5 py-1 rounded border border-gray-700 text-gray-300 hover:text-gray-100 hover:border-gray-500"
              >
                Export
              </button>
            </div>

            {gatewayCheckNote && <p className="mt-3 text-[11px] font-mono text-gray-400">{gatewayCheckNote}</p>}
            {lastSuccessfulGatewayCheck && (
              <p className="mt-1 text-[11px] font-mono text-gray-500">
                Last successful check: <span className="text-gray-300">{lastSuccessfulGatewayCheck}</span>
              </p>
            )}
            {gatewayCopyNote && <p className="mt-1 text-[11px] font-mono text-cyan-300">{gatewayCopyNote}</p>}
            {gatewayCheckFailureStreak >= 2 && (
              <p className="mt-1 text-[11px] font-mono text-amber-300">
                Repeated failures detected. Verify gateway URL/token in Settings.
              </p>
            )}

            <details className="mt-3 border-t border-gray-800 pt-2">
              <summary className="cursor-pointer text-[11px] text-gray-500 hover:text-gray-300 font-mono">
                Diagnostics details
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-[10px] text-gray-500 font-mono">{gatewayDiagnosticsText}</pre>
            </details>
          </div>
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
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold font-mono mt-0.5 ${colorMap[color] || "text-gray-300"}`}>
        {value}
        {total != null && <span className="text-xs text-gray-600 ml-1">/ {total}</span>}
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
          <span className={`w-1.5 h-1.5 rounded-full ${indicator === "green" ? "bg-green-500" : "bg-red-500"}`} />
        )}
        <span className="text-xs font-mono text-gray-300 capitalize">{value}</span>
      </div>
    </div>
  );
}
