"use client";

import { CalendarEvent, domainColors } from "@/lib/mock-calendar";

interface EventBlockProps {
  event: CalendarEvent;
  hasConflict: boolean;
}

export default function EventBlock({ event, hasConflict }: EventBlockProps) {
  const colors = domainColors[event.domain];
  const startHour = event.startTime.getHours();
  const startMinute = event.startTime.getMinutes();
  const endHour = event.endTime.getHours();
  const endMinute = event.endTime.getMinutes();
  
  const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  const height = (duration / 30) * 48; // 48px per 30-minute slot
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      className={`absolute left-1 right-1 rounded-lg border-2 p-2 ${colors.bg} ${
        colors.border
      } ${colors.text} ${hasConflict ? "ring-2 ring-red-500" : ""} ${
        event.protected ? "bg-stripe" : ""
      }`}
      style={{ height: `${height}px` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {event.protected && <span className="text-xs">🔒</span>}
            <h4 className="text-sm font-semibold truncate">{event.title}</h4>
          </div>
          <p className="text-xs mt-1">
            {formatTime(event.startTime)} - {formatTime(event.endTime)}
          </p>
        </div>
      </div>
    </div>
  );
}
