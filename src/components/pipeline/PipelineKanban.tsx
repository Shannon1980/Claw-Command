"use client";

import { useState } from "react";
import {
  Opportunity,
  Application,
  STAGE_COLORS,
  formatUsd,
} from "@/lib/mock-pipeline";
import OpportunityCard from "./OpportunityCard";
import ApplicationCard from "./ApplicationCard";

interface KanbanProps<T> {
  stages: readonly string[];
  items: T[];
  getStage: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
  getValue?: (item: T) => number;
}

function KanbanColumn<T>({
  stage,
  items,
  renderCard,
  getKey,
  getValue,
  onDrop,
}: {
  stage: string;
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
  getValue?: (item: T) => number;
  onDrop: (id: string, stage: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const totalValue = getValue
    ? items.reduce((sum, item) => sum + getValue(item), 0)
    : 0;

  return (
    <div
      className={`flex-shrink-0 w-64 flex flex-col rounded-lg border transition-colors ${
        dragOver
          ? "border-cyan-500/50 bg-cyan-500/5"
          : "border-gray-800 bg-gray-900/30"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const id = e.dataTransfer.getData("text/plain");
        onDrop(id, stage);
      }}
    >
      {/* Column Header */}
      <div
        className={`px-3 py-2 border-t-2 rounded-t-lg ${
          STAGE_COLORS[stage] || "border-t-gray-600"
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
            {stage}
          </h3>
          <span className="text-[10px] font-mono text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
            {items.length}
          </span>
        </div>
        {getValue && totalValue > 0 && (
          <div className="text-[10px] font-mono text-gray-500 mt-1">
            {formatUsd(totalValue)}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px]">
        {items.map((item) => (
          <div key={getKey(item)}>{renderCard(item)}</div>
        ))}
        {items.length === 0 && (
          <div className="text-xs text-gray-700 text-center py-4 font-mono">
            No items
          </div>
        )}
      </div>
    </div>
  );
}

export function OpportunityKanban({
  stages,
  opportunities,
}: {
  stages: readonly string[];
  opportunities: Opportunity[];
}) {
  const [items, setItems] = useState(opportunities);

  const handleDrop = (id: string, newStage: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, stage: newStage } : item
      )
    );
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {stages.map((stage) => (
        <KanbanColumn
          key={stage}
          stage={stage}
          items={items.filter((o) => o.stage === stage)}
          renderCard={(opp) => <OpportunityCard opp={opp} />}
          getKey={(o) => o.id}
          getValue={(o) => o.valueUsd}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}

export function ApplicationKanban({
  stages,
  applications,
}: {
  stages: readonly string[];
  applications: Application[];
}) {
  const [items, setItems] = useState(applications);

  const handleDrop = (id: string, newStage: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, stage: newStage } : item
      )
    );
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {stages.map((stage) => (
        <KanbanColumn
          key={stage}
          stage={stage}
          items={items.filter((a) => a.stage === stage)}
          renderCard={(app) => <ApplicationCard app={app} />}
          getKey={(a) => a.id}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
