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

