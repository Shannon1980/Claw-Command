"use client";

import { useState, useEffect } from "react";
import WeekView from "@/components/calendar/WeekView";
import ConflictPanel from "@/components/calendar/ConflictPanel";
import {
  detectConflicts,
  type CalendarEvent,
  type EventDomain,
} from "@/lib/mock-calendar";

export default function CalendarPage() {
  const getCurrentWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  };

  const [weekStart, setWeekStart] = useState(getCurrentWeekStart());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  useEffect(() => {
    setLoading(true);
    const start = weekStart.toISOString();
    const end = weekEnd.toISOString();
    fetch(`/api/calendar/events?start=${start}&end=${end}`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const parsed: CalendarEvent[] = list.map((e: Record<string, unknown>) => ({
          id: String(e.id ?? ""),
          title: String(e.title ?? ""),
          domain: (e.domain as EventDomain) ?? "vorentoe",
          startTime: e.startTime instanceof Date ? e.startTime : new Date((e.startTime as string) ?? (e.start_time as string) ?? ""),
          endTime: e.endTime instanceof Date ? e.endTime : new Date((e.endTime as string) ?? (e.end_time as string) ?? ""),
          protected: Boolean(e.protected),
          description: e.description as string | undefined,
        }));
        setEvents(parsed);
      })
      .catch((err) => {
        console.error("Failed to load calendar events:", err);
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, [weekStart.toISOString().slice(0, 10)]);

  const conflicts = detectConflicts(events);

  const goToPreviousWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const goToToday = () => {
    setWeekStart(getCurrentWeekStart());
  };

  const formatWeekRange = () => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);

    const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
    const endMonth = end.toLocaleDateString("en-US", { month: "short" });
    const startDay = weekStart.getDate();
    const endDay = end.getDate();
    const year = weekStart.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header with navigation */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">📅 Calendar</h1>
            <p className="text-sm text-gray-400 mt-1">
              {formatWeekRange()}
              {loading && " (loading...)"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={goToPreviousWeek}
              className="px-4 py-2 bg-gray-800 text-gray-100 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNextWeek}
              className="px-4 py-2 bg-gray-800 text-gray-100 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Calendar view with conflict panel */}
      <div className="flex-1 flex overflow-hidden">
        <WeekView weekStart={weekStart} events={events} conflicts={conflicts} />
        <ConflictPanel conflicts={conflicts} />
      </div>
    </div>
  );
}
