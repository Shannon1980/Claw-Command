"use client";

import { useBrief } from "@/lib/hooks/useBrief";
import BriefSummaryCard from "./BriefSummaryCard";
import DomainSection from "./DomainSection";
import PriorityList from "./PriorityList";
import WeatherCard from "./WeatherCard";

interface BriefContentProps {
  domainFilter?: string;
  title?: string;
}

export default function BriefContent({
  domainFilter,
  title = "Good morning, Shannon 👋",
}: BriefContentProps) {
  const { data, loading, error, refresh } = useBrief(domainFilter);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{title}</h1>
            <p className="text-gray-400 text-lg" suppressHydrationWarning>{currentDate}</p>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-5 h-5 border-2 border-gray-500 border-t-gray-200 rounded-full animate-spin" />
            Loading your brief...
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-400">Failed to load brief.</div>
        </div>
      </div>
    );
  }

  const { summary, domains, priorities } = data;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{title}</h1>
            <p className="text-gray-400 text-lg" suppressHydrationWarning>{currentDate}</p>
          </div>
          <button
            onClick={refresh}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-amber-900/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
            Using fallback data: {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <WeatherCard />
          <BriefSummaryCard
            icon="✅"
            label="Tasks Completed Overnight"
            value={summary.tasksCompleted}
            trend="up"
          />
          <BriefSummaryCard
            icon="🔔"
            label="New Alerts"
            value={summary.newAlerts}
            trend="neutral"
          />
          <BriefSummaryCard
            icon="📋"
            label="Pending Approvals"
            value={summary.pendingApprovals}
            trend="neutral"
          />
        </div>

        {/* Priority List */}
        <div className="mb-8">
          <PriorityList priorities={priorities} />
        </div>

        {/* Domain Breakdown */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Domain Status</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {domains.map((domain) => (
              <DomainSection key={domain.name} domain={domain} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
