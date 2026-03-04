"use client";

import { useState } from "react";
import WeekView from "@/components/calendar/WeekView";
import ConflictPanel from "@/components/calendar/ConflictPanel";
import { mockEvents, detectConflicts } from "@/lib/mock-calendar";

export default function CalendarPage() {
  // Start with current week (Sunday as first day)
  const getCurrentWeekStart = () => {
    const now = new Date("2026-03-04T12:00:00"); // Wednesday for demo
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  };

  const [weekStart, setWeekStart] = useState(getCurrentWeekStart());
  const events = mockEvents;
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
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
    const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short" });
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
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
            <p className="text-sm text-gray-400 mt-1">{formatWeekRange()}</p>
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
