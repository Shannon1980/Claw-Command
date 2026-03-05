"use client";

import { Agent, DOMAIN_COLORS, STATUS_CONFIG } from "@/lib/mock-data";
import { useGatewayContext } from "@/lib/contexts/GatewayContext";
import { useMemo } from "react";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AgentCard({ agent }: { agent: Agent }) {
  const gateway = useGatewayContext();
  
  // Get real-time status if available
  const realTimeStatus = gateway.state.agentStatus.get(agent.id);
  
  // Compute display values
  const displayStatus = useMemo(() => {
    if (!realTimeStatus) return agent.status;
    
    // Map OpenClaw status to dashboard status
    switch (realTimeStatus.status) {
      case "active": return "active";
      case "idle": return "idle";
      case "offline": return "blocked"; // or 'offline' if supported
      default: return "idle";
    }
  }, [realTimeStatus, agent.status]);
  
  const statusConfig = STATUS_CONFIG[displayStatus] || STATUS_CONFIG["idle"];
  const domainStyle = DOMAIN_COLORS[agent.domain];
  
  // Find active task for this agent from queue/sessions
  const activeTask = useMemo(() => {
    // If we have a real-time task from gateway (e.g. from session label)
    // For now, gateway tasks are in queue, but running tasks are also sessions.
    // Let's check if there's a running task for this agent
    const runningTask = gateway.state.taskQueue.find(t => t.agentId === agent.id && t.status === "running");
    if (runningTask) return runningTask.taskName;
    
    return agent.currentTask;
  }, [gateway.state.taskQueue, agent.id, agent.currentTask]);

  const lastUpdate = realTimeStatus 
    ? timeAgo(realTimeStatus.lastHeartbeat || new Date().toISOString()) 
    : timeAgo(agent.updatedAt);

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{agent.emoji}</span>
          <span className="font-semibold text-gray-100">{agent.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${domainStyle}`}
          >
            {agent.domain}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          {statusConfig.pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusConfig.color} opacity-75`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusConfig.color}`}
          />
        </span>
        <span className="text-sm text-gray-400">{statusConfig.label}</span>
      </div>

      {/* Current Task */}
      {activeTask ? (
        <p className="text-sm text-gray-300 bg-gray-800/50 rounded px-2 py-1.5 font-mono text-xs leading-relaxed line-clamp-2">
          {activeTask}
        </p>
      ) : (
        <p className="text-sm text-gray-600 italic">No active task</p>
      )}

      {/* Footer */}
      <div className="mt-3 text-xs text-gray-600">
        Updated {lastUpdate}
      </div>
    </div>
  );
}
