"use client";

import { formatUsd } from "@/lib/pipeline/config";
import type { Opportunity } from "@/lib/pipeline/types";

interface Props {
  opportunities: Opportunity[];
}

export default function PipelineStats({ opportunities }: Props) {
  const totalValue = opportunities.reduce((sum, o) => sum + o.valueUsd, 0);
  const weightedValue = opportunities.reduce(
    (sum, o) => sum + (o.valueUsd * o.probability) / 100,
    0
  );
  const wonCount = opportunities.filter((o) => o.stage === "win").length;
  const lostCount = opportunities.filter((o) => o.stage === "lost").length;
  const winRate =
    wonCount + lostCount > 0
      ? Math.round((wonCount / (wonCount + lostCount)) * 100)
      : 0;

  const stats = [
    { label: "Total Pipeline", value: formatUsd(totalValue), color: "text-cyan-400" },
    { label: "Weighted Value", value: formatUsd(weightedValue), color: "text-blue-400" },
    { label: "Active Deals", value: String(opportunities.filter((o) => o.stage !== "win" && o.stage !== "lost").length), color: "text-gray-200" },
    { label: "Won", value: String(wonCount), color: "text-green-400" },
    { label: "Win Rate", value: `${winRate}%`, color: "text-amber-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-gray-900/60 border border-gray-800 rounded-lg px-4 py-3"
        >
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">
            {stat.label}
          </div>
          <div className={`text-xl font-bold font-mono ${stat.color}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
