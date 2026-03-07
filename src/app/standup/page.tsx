"use client";

import { useEffect, useState } from "react";

interface StandupReport {
  completed: StandupItem[];
  started: StandupItem[];
  blocked: StandupItem[];
  activityCount: number;
}

interface StandupItem {
  id: string;
  title: string;
  agentName?: string;
  agentEmoji?: string;
  description?: string;
  createdAt: string;
}

function todayString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export default function StandupPage() {
  const [date, setDate] = useState(todayString());
  const [report, setReport] = useState<StandupReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/standup?date=${d}`);
      if (!res.ok) throw new Error("Failed to fetch standup report");
      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError((err as Error).message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(date);
  }, [date]);

  const sections = [
    {
      key: "completed",
      title: "Completed",
      items: report?.completed || [],
      borderColor: "border-green-500/30",
      bgColor: "bg-green-500/5",
      dotColor: "bg-green-500",
      textColor: "text-green-400",
    },
    {
      key: "started",
      title: "Started",
      items: report?.started || [],
      borderColor: "border-blue-500/30",
      bgColor: "bg-blue-500/5",
      dotColor: "bg-blue-500",
      textColor: "text-blue-400",
    },
    {
      key: "blocked",
      title: "Blocked",
      items: report?.blocked || [],
      borderColor: "border-amber-500/30",
      bgColor: "bg-amber-500/5",
      dotColor: "bg-amber-500",
      textColor: "text-amber-400",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[900px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">Standup Report</h1>
            <p className="text-xs text-gray-500 font-mono">Daily summary of agent activity</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-mono">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : !report ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No report data available for this date</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-500 font-mono">Activity Count</p>
              <p className="text-2xl font-bold text-gray-100">{report.activityCount}</p>
            </div>

            {/* Sections */}
            {sections.map((section) => (
              <div key={section.key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${section.dotColor}`} />
                  <h2 className={`text-sm font-medium ${section.textColor}`}>{section.title}</h2>
                  <span className="text-xs text-gray-600 font-mono">({section.items.length})</span>
                </div>
                {section.items.length === 0 ? (
                  <div className={`${section.bgColor} border ${section.borderColor} rounded-lg p-4`}>
                    <p className="text-xs text-gray-500">No items</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className={`${section.bgColor} border ${section.borderColor} rounded-lg px-4 py-3`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {item.agentEmoji && <span className="text-sm">{item.agentEmoji}</span>}
                            <span className="text-sm text-gray-200">{item.title}</span>
                            {item.agentName && (
                              <span className="text-[11px] text-gray-500 font-mono">{item.agentName}</span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-600 font-mono">
                            {new Date(item.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
