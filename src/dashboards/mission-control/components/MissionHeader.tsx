"use client";

export default function MissionHeader() {
  return (
    <header className="border-b border-gray-800/80 bg-gray-950/95">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <h1 className="text-xl font-bold text-gray-100 tracking-tight">
          Mission Control
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Kanban, schedule, memory recall, security posture, decisions, and dependencies
        </p>
      </div>
    </header>
  );
}
