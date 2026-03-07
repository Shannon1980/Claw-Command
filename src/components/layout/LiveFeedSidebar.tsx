"use client";

import { useState, useEffect, useCallback } from "react";

interface FeedEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export default function LiveFeedSidebar() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [unread, setUnread] = useState(0);

  const addEvent = useCallback(
    (event: FeedEvent) => {
      setEvents((prev) => {
        const next = [event, ...prev];
        if (next.length > 200) next.length = 200;
        return next;
      });
      if (!open) setUnread((n) => n + 1);
    },
    [open]
  );

  useEffect(() => {
    const es = new EventSource("/api/sse/feed");
    const eventTypes = [
      "agent_status",
      "task_update",
      "session_event",
      "log_entry",
      "alert_fired",
      "chat_message",
      "pipeline_progress",
    ];

    for (const type of eventTypes) {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          addEvent({
            id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            type,
            data,
            timestamp: new Date().toISOString(),
          });
        } catch {
          // ignore
        }
      });
    }

    return () => es.close();
  }, [addEvent]);

  const toggleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) setUnread(0);
  };

  const typeColors: Record<string, string> = {
    agent_status: "text-cyan-400",
    task_update: "text-blue-400",
    session_event: "text-purple-400",
    log_entry: "text-gray-400",
    alert_fired: "text-red-400",
    chat_message: "text-green-400",
    pipeline_progress: "text-amber-400",
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={toggleOpen}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[90] bg-gray-900 border border-gray-700 border-r-0 rounded-l-lg px-1.5 py-3 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <div className="relative">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center text-[8px] font-bold text-white bg-red-500 rounded-full">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
      </button>

      {/* Sidebar panel */}
      {open && (
        <div className="fixed right-0 top-10 bottom-0 z-[85] w-72 bg-gray-950 border-l border-gray-800 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">
              Live Feed
            </span>
            <button
              onClick={() => setEvents([])}
              className="text-[10px] text-gray-600 hover:text-gray-400 font-mono"
            >
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {events.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-gray-600 font-mono">
                Waiting for events...
              </div>
            )}
            {events.map((evt) => (
              <div
                key={evt.id}
                className="px-3 py-2 border-b border-gray-800/40 hover:bg-gray-900/60"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase ${
                      typeColors[evt.type] || "text-gray-500"
                    }`}
                  >
                    {evt.type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[9px] font-mono text-gray-700 ml-auto">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                  {(evt.data.message as string) ||
                    (evt.data.action as string) ||
                    JSON.stringify(evt.data).slice(0, 80)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
