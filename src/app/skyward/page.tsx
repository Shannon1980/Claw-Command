"use client";

import React from "react";
import Link from "next/link";
import { useSkyward } from "@/lib/hooks/useSkyward";
import WorkstreamCard from "@/components/skyward/WorkstreamCard";

const statusConfig: Record<
  string,
  { bg: string; border: string; text: string; label: string }
> = {
  on_track: {
    bg: "bg-green-900/20",
    border: "border-green-500",
    text: "text-green-400",
    label: "On Track",
  },
  at_risk: {
    bg: "bg-amber-900/20",
    border: "border-amber-500",
    text: "text-amber-400",
    label: "At Risk",
  },
  blocked: {
    bg: "bg-red-900/20",
    border: "border-red-500",
    text: "text-red-400",
    label: "Blocked",
  },
};

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SkywardPage() {
  const { data, loading, error, refresh } = useSkyward();
  const { workstreams, actionItemsForShannon, keyUpdates } = data;

  const onTrack = workstreams.filter((w) => w.status === "on_track").length;
  const atRisk = workstreams.filter((w) => w.status === "at_risk").length;
  const blocked = workstreams.filter((w) => w.status === "blocked").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-500 border-t-gray-200 rounded-full animate-spin" />
          Loading Skyward...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">Skyward IT Solutions</h1>
              <span className="text-3xl">🌤️</span>
            </div>
            <p className="text-gray-400 text-lg mb-4">
              SEAS IT Program Workstreams
            </p>
            <div className="flex gap-4 text-sm">
              <div className="bg-green-900/20 border border-green-500 px-4 py-2 rounded-lg">
                <span className="text-green-400 font-semibold">
                  {onTrack} On Track
                </span>
              </div>
              <div className="bg-amber-900/20 border border-amber-500 px-4 py-2 rounded-lg">
                <span className="text-amber-400 font-semibold">
                  {atRisk} At Risk
                </span>
              </div>
              <div className="bg-red-900/20 border border-red-500 px-4 py-2 rounded-lg">
                <span className="text-red-400 font-semibold">
                  {blocked} Blocked
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={refresh}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-2 bg-amber-900/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
            {String(error)}
          </div>
        )}

        {/* Action Items for Me */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <span>📋</span> Action Items for Me
          </h2>
          {actionItemsForShannon.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-gray-400">
              No action items requiring your approval.
            </div>
          ) : (
            <div className="space-y-2">
              {actionItemsForShannon.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks`}
                  className="block bg-amber-900/20 border border-amber-500/50 rounded-lg px-4 py-3 hover:bg-amber-900/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-amber-400 font-medium">
                        {task.agent_emoji} {task.agent_name}
                      </span>
                      <span className="text-gray-500 mx-2">•</span>
                      <span className="text-gray-100">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          statusConfig[task.status]?.bg || "bg-gray-800"
                        } ${statusConfig[task.status]?.text || "text-gray-400"}`}
                      >
                        {statusConfig[task.status]?.label || task.status}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-gray-500">
                          Due {task.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Key Updates (from customer or for Skyward leadership) */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <span>📢</span> Key Updates
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            From your notes to Bob and recent Skyward activity
          </p>
          {keyUpdates.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-gray-400">
              No recent updates. Post SEAS IT and Skyward notes to Bob to see them here.
            </div>
          ) : (
            <div className="space-y-3">
              {keyUpdates.map((update) => (
                <div
                  key={update.id}
                  className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
                >
                  <p className="text-gray-200 text-sm whitespace-pre-wrap">
                    {update.content}
                  </p>
                  <span className="text-xs text-gray-500 mt-1 block">
                    {formatTimestamp(update.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workstreams */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Active Workstreams</h2>
          <div className="space-y-4">
            {workstreams.map((workstream) => (
              <WorkstreamCard
                key={workstream.id}
                workstream={{
                  ...workstream,
                  status: workstream.status as "on_track" | "at_risk" | "blocked",
                  milestones: workstream.milestones || [],
                  riskFactors: workstream.riskFactors || [],
                  tasks: workstream.tasks,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
