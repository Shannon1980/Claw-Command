import React from "react";
import BriefSummaryCard from "@/components/brief/BriefSummaryCard";
import DomainSection from "@/components/brief/DomainSection";
import PriorityList from "@/components/brief/PriorityList";
import {
  getOvernightSummary,
  getDomainStatuses,
  getPriorities,
} from "@/lib/mock-brief";

export default function DailyBriefPage() {
  const summary = getOvernightSummary();
  const domains = getDomainStatuses();
  const priorities = getPriorities();

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Good morning, Shannon 👋</h1>
          <p className="text-gray-400 text-lg">{currentDate}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
