"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import WeekView from "@/components/calendar/WeekView";
import ConflictPanel from "@/components/calendar/ConflictPanel";
import {
  detectConflicts,
  isEventDomain,
  type CalendarEvent,
  type EventDomain,
} from "@/lib/calendar/types";

interface ApiCalendarEvent {
  id?: unknown;
  title?: unknown;
  domain?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  start_time?: unknown;
  end_time?: unknown;
  protected?: unknown;
  description?: unknown;
}

const getCurrentWeekStart = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
};

const formatLastUpdated = (value: Date | null) => {
  if (!value) return "Never";
  return value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const parseEventDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toCalendarEvent = (event: ApiCalendarEvent): CalendarEvent | null => {
  const startTime = parseEventDate(event.startTime ?? event.start_time);
  const endTime = parseEventDate(event.endTime ?? event.end_time);

  if (!startTime || !endTime) return null;

  const rawDomain = event.domain;
  const domain: EventDomain = isEventDomain(rawDomain) ? rawDomain : "vorentoe";

  return {
    id: String(event.id ?? ""),
    title: String(event.title ?? ""),
    domain,
    startTime,
    endTime,
    protected: Boolean(event.protected),
    description: typeof event.description === "string" ? event.description : undefined,
  };
};

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const weekEnd = useMemo(() => {
    const value = new Date(weekStart);
    value.setDate(weekStart.getDate() + 6);
    value.setHours(23, 59, 59, 999);
    return value;
  }, [weekStart]);

  const loadEvents = useCallback(
    async (signal?: AbortSignal) => {
      const firstLoad = lastUpdated === null;
      setError(null);
      setLoading(firstLoad);
      setRefreshing(!firstLoad);

      try {
        const start = weekStart.toISOString();
        const end = weekEnd.toISOString();
        const res = await fetch(`/api/calendar/events?start=${start}&end=${end}`, { signal, cache: "no-store" });

        if (!res.ok) {
          let message = `Failed to load events (${res.status})`;
          try {
            const payload = (await res.json()) as { error?: string };
            if (payload?.error) message = payload.error;
          } catch {
            // ignore parse failures
          }
          throw new Error(message);
        }

        const data = (await res.json()) as unknown;
        const list = Array.isArray(data) ? (data as ApiCalendarEvent[]) : [];
        const parsed = list.map(toCalendarEvent).filter((e): e is CalendarEvent => e !== null);

        setEvents(parsed);
        setLastUpdated(new Date());
      } catch (err) {
        if (signal?.aborted) return;
        const message = err instanceof Error ? err.message : "Failed to load calendar events";
        console.error("Failed to load calendar events:", err);
        setEvents([]);
        setError(message);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [lastUpdated, weekEnd, weekStart]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadEvents(controller.signal);
    return () => controller.abort();
  }, [loadEvents, refreshNonce]);

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

  const refresh = () => {
    setRefreshNonce((value) => value + 1);
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
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">📅 Calendar</h1>
            <p className="text-sm text-gray-400 mt-1">{formatWeekRange()}</p>
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {formatLastUpdated(lastUpdated)}
              {refreshing ? " • refreshing..." : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              disabled={loading || refreshing}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ↻ Refresh
            </button>
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

      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-red-700 bg-red-950/60 px-4 py-3 text-sm text-red-200 flex items-center justify-between gap-3">
          <span>Could not load calendar events: {error}</span>
          <button onClick={refresh} className="underline hover:text-white transition-colors">
            Try again
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden mt-3">
        {loading ? (
          <div className="flex-1 grid place-items-center bg-gray-950 text-gray-400">Loading calendar events…</div>
        ) : (
          <>
            <div className="flex-1 flex flex-col min-w-0">
              {events.length === 0 && !error && (
                <div className="mx-4 mb-3 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-300">
                  No events found for this week.
                </div>
              )}
              <WeekView weekStart={weekStart} events={events} conflicts={conflicts} />
            </div>
            <ConflictPanel conflicts={conflicts} />
          </>
        )}
      </div>
    </div>
  );
}
