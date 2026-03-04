"use client";

import { CalendarEvent, EventConflict } from "@/lib/mock-calendar";
import EventBlock from "./EventBlock";

interface WeekViewProps {
  weekStart: Date;
  events: CalendarEvent[];
  conflicts: EventConflict[];
}

export default function WeekView({ weekStart, events, conflicts }: WeekViewProps) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM (index 0-14)
  
  const getDayDate = (dayIndex: number): Date => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    return date;
  };
  
  const getEventsForDay = (dayIndex: number): CalendarEvent[] => {
    const dayDate = getDayDate(dayIndex);
    return events.filter((event) => {
      return event.startTime.toDateString() === dayDate.toDateString();
    });
  };
  
  const hasConflict = (eventId: string): boolean => {
    return conflicts.some((conflict) =>
      conflict.events.some((e) => e.id === eventId)
    );
  };
  
  const getEventPosition = (event: CalendarEvent): { top: number } => {
    const startHour = event.startTime.getHours();
    const startMinute = event.startTime.getMinutes();
    const minutesFrom8AM = (startHour - 8) * 60 + startMinute;
    const top = (minutesFrom8AM / 30) * 48; // 48px per 30-minute slot
    return { top };
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-950">
      <div className="min-w-[800px]">
        {/* Header with days */}
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800">
          <div className="grid grid-cols-8 gap-px">
            <div className="bg-gray-900 p-4"></div>
            {days.map((day, idx) => {
              const date = getDayDate(idx);
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={day}
                  className={`bg-gray-900 p-4 text-center ${
                    isToday ? "bg-blue-900/20" : ""
                  }`}
                >
                  <div className="text-xs text-gray-500">{day}</div>
                  <div
                    className={`text-lg font-semibold mt-1 ${
                      isToday ? "text-blue-400" : "text-gray-100"
                    }`}
                  >
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time grid */}
        <div className="relative">
          <div className="grid grid-cols-8 gap-px bg-gray-800">
            {/* Time labels column */}
            <div className="bg-gray-950">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-24 border-b border-gray-800 flex items-start justify-end pr-2 pt-1"
                >
                  <span className="text-xs text-gray-500">
                    {hour === 0
                      ? "12 AM"
                      : hour < 12
                      ? `${hour} AM`
                      : hour === 12
                      ? "12 PM"
                      : `${hour - 12} PM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((_, dayIndex) => {
              const dayEvents = getEventsForDay(dayIndex);
              return (
                <div key={dayIndex} className="bg-gray-950 relative">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="h-24 border-b border-gray-800"
                    ></div>
                  ))}
                  
                  {/* Events overlay */}
                  {dayEvents.map((event) => {
                    const position = getEventPosition(event);
                    return (
                      <div
                        key={event.id}
                        className="absolute w-full"
                        style={{ top: `${position.top}px` }}
                      >
                        <EventBlock
                          event={event}
                          hasConflict={hasConflict(event.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
