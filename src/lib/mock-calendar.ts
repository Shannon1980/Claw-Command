export type EventDomain = "vorentoe" | "skyward" | "community" | "teaching";

export interface CalendarEvent {
  id: string;
  title: string;
  domain: EventDomain;
  startTime: Date;
  endTime: Date;
  protected: boolean;
  description?: string;
}

export interface EventConflict {
  id: string;
  events: CalendarEvent[];
  overlapStart: Date;
  overlapEnd: Date;
  suggestion: string;
}

// Helper to create dates for the current week
function getCurrentWeekDate(dayOffset: number, hour: number, minute: number = 0): Date {
  const now = new Date("2026-03-04T12:00:00"); // Wednesday
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  const date = new Date(startOfWeek);
  date.setDate(startOfWeek.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export const mockEvents: CalendarEvent[] = [
  // Monday
  {
    id: "1",
    title: "SEAS IT Standup",
    domain: "skyward",
    startTime: getCurrentWeekDate(1, 9, 0),
    endTime: getCurrentWeekDate(1, 10, 0),
    protected: false,
  },
  {
    id: "2",
    title: "Vorentoe Strategy Session",
    domain: "vorentoe",
    startTime: getCurrentWeekDate(1, 14, 0),
    endTime: getCurrentWeekDate(1, 15, 0),
    protected: false,
  },
  // Tuesday
  {
    id: "3",
    title: "MBE Application Review",
    domain: "vorentoe",
    startTime: getCurrentWeekDate(2, 10, 0),
    endTime: getCurrentWeekDate(2, 11, 0),
    protected: false,
  },
  {
    id: "4",
    title: "Teaching — SAFe SSM (ITBiz 301)",
    domain: "teaching",
    startTime: getCurrentWeekDate(2, 18, 0),
    endTime: getCurrentWeekDate(2, 21, 0),
    protected: true,
    description: "Recurring SAFe Scrum Master instruction through April 2026",
  },
  // Wednesday
  {
    id: "5",
    title: "DHS Border Tech Prep",
    domain: "vorentoe",
    startTime: getCurrentWeekDate(3, 13, 0),
    endTime: getCurrentWeekDate(3, 14, 0),
    protected: false,
  },
  // Thursday
  {
    id: "6",
    title: "SEAS IT Sprint Review",
    domain: "skyward",
    startTime: getCurrentWeekDate(4, 9, 0),
    endTime: getCurrentWeekDate(4, 10, 0),
    protected: false,
  },
  {
    id: "7",
    title: "Teaching — SAFe SSM (ITBiz 301)",
    domain: "teaching",
    startTime: getCurrentWeekDate(4, 18, 0),
    endTime: getCurrentWeekDate(4, 21, 0),
    protected: true,
    description: "Recurring SAFe Scrum Master instruction through April 2026",
  },
  // Create a conflict: overlapping event on Thursday evening
  {
    id: "8",
    title: "Client Proposal Review Call",
    domain: "vorentoe",
    startTime: getCurrentWeekDate(4, 19, 0),
    endTime: getCurrentWeekDate(4, 20, 0),
    protected: false,
  },
  // Friday
  {
    id: "9",
    title: "PTA Planning Call",
    domain: "community",
    startTime: getCurrentWeekDate(5, 11, 0),
    endTime: getCurrentWeekDate(5, 12, 0),
    protected: false,
  },
];

export const domainColors: Record<EventDomain, { bg: string; border: string; text: string }> = {
  vorentoe: {
    bg: "bg-blue-900/50",
    border: "border-blue-600",
    text: "text-blue-200",
  },
  skyward: {
    bg: "bg-purple-900/50",
    border: "border-purple-600",
    text: "text-purple-200",
  },
  community: {
    bg: "bg-green-900/50",
    border: "border-green-600",
    text: "text-green-200",
  },
  teaching: {
    bg: "bg-amber-900/50",
    border: "border-amber-600",
    text: "text-amber-200",
  },
};

export function detectConflicts(events: CalendarEvent[]): EventConflict[] {
  const conflicts: EventConflict[] = [];
  
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i];
      const event2 = events[j];
      
      // Check if events overlap
      const overlaps = 
        event1.startTime < event2.endTime && 
        event1.endTime > event2.startTime;
      
      if (overlaps) {
        const overlapStart = event1.startTime > event2.startTime 
          ? event1.startTime 
          : event2.startTime;
        const overlapEnd = event1.endTime < event2.endTime 
          ? event1.endTime 
          : event2.endTime;
        
        let suggestion = "";
        if (event1.protected || event2.protected) {
          const protectedEvent = event1.protected ? event1 : event2;
          const conflictingEvent = event1.protected ? event2 : event1;
          suggestion = `Reschedule "${conflictingEvent.title}" — "${protectedEvent.title}" is protected time`;
        } else {
          suggestion = `Consider rescheduling one of these events`;
        }
        
        conflicts.push({
          id: `conflict-${event1.id}-${event2.id}`,
          events: [event1, event2],
          overlapStart,
          overlapEnd,
          suggestion,
        });
      }
    }
  }
  
  return conflicts;
}

export function getEventsForWeek(startDate: Date): CalendarEvent[] {
  // For this mock, we're just returning all events
  // In a real implementation, you'd filter by week
  return mockEvents;
}
