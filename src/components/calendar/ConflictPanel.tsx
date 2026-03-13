"use client";

import { EventConflict } from "@/lib/calendar/types";

interface ConflictPanelProps {
  conflicts: EventConflict[];
}

export default function ConflictPanel({ conflicts }: ConflictPanelProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-100 mb-4">
        ⚠️ Conflicts
      </h2>
      
      {conflicts.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-gray-400 text-sm">No conflicts this week</p>
        </div>
      ) : (
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="bg-gray-800 rounded-lg p-4 border-l-4 border-red-500"
            >
              <div className="space-y-3">
                {conflict.events.map((event, idx) => (
                  <div key={event.id}>
                    <div className="flex items-start gap-2">
                      {event.protected && (
                        <span className="text-amber-500 text-xs">🔒</span>
                      )}
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-100">
                          {event.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(event.startTime)} • {formatTime(event.startTime)} -{" "}
                          {formatTime(event.endTime)}
                        </p>
                      </div>
                    </div>
                    {idx < conflict.events.length - 1 && (
                      <div className="text-xs text-red-400 font-medium my-2 pl-5">
                        ⚡ Overlaps
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-300">
                  <span className="font-semibold">Suggestion:</span>{" "}
                  {conflict.suggestion}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Overlap: {formatTime(conflict.overlapStart)} -{" "}
                  {formatTime(conflict.overlapEnd)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
