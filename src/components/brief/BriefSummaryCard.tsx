import React from "react";

interface BriefSummaryCardProps {
  icon: string;
  label: string;
  value: number;
  trend?: "up" | "down" | "neutral";
}

export default function BriefSummaryCard({
  icon,
  label,
  value,
  trend = "neutral",
}: BriefSummaryCardProps) {
  const trendIcon =
    trend === "up" ? "↗" : trend === "down" ? "↘" : "→";
  const trendColor =
    trend === "up"
      ? "text-green-400"
      : trend === "down"
      ? "text-red-400"
      : "text-gray-400";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-3xl mb-2">{icon}</div>
          <div className="text-gray-400 text-sm mb-1">{label}</div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-gray-100">{value}</div>
            <span className={`text-lg ${trendColor}`}>{trendIcon}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
