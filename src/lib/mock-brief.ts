// Mock data for Daily Brief dashboard

export interface OvernightSummary {
  tasksCompleted: number;
  newAlerts: number;
  pendingApprovals: number;
}

export interface DomainStatus {
  name: string;
  icon: string;
  activeTasks: number;
  blockers: string[];
  keyUpdates: string[];
}

export interface Priority {
  id: string;
  title: string;
  domain: string;
  urgency: "critical" | "high" | "medium";
  dueDate?: string;
}

export const getOvernightSummary = (): OvernightSummary => ({
  tasksCompleted: 12,
  newAlerts: 3,
  pendingApprovals: 5,
});

export const getDomainStatuses = (): DomainStatus[] => [
  {
    name: "Vorentoe",
    icon: "💼",
    activeTasks: 8,
    blockers: ["8(a) certification pending IRS verification"],
    keyUpdates: [
      "GSA Schedule submission ready for review",
      "New federal RFP identified (DHS)",
      "Website analytics showing 40% traffic increase",
    ],
  },
  {
    name: "Skyward",
    icon: "🌤️",
    activeTasks: 6,
    blockers: [],
    keyUpdates: [
      "SEAS IT Infrastructure Migration on track (75% complete)",
      "Sprint review scheduled for Friday 2pm",
      "Security audit passed preliminary checks",
    ],
  },
  {
    name: "Community",
    icon: "👥",
    activeTasks: 4,
    blockers: [],
    keyUpdates: [
      "PTA meeting scheduled Thursday 7pm",
      "Destination Imagination regional competition next week",
      "Spring fundraiser planning underway",
    ],
  },
  {
    name: "Teaching",
    icon: "📚",
    activeTasks: 2,
    blockers: [],
    keyUpdates: [
      "SAFe Scrum Master class tonight at 6pm (Lesson 1 continuation)",
      "Student assignments graded and posted",
      "Next cohort enrollment opens April 1",
    ],
  },
];

export const getPriorities = (): Priority[] => [
  {
    id: "p1",
    title: "Review and submit GSA Schedule 70 application",
    domain: "Vorentoe",
    urgency: "critical",
    dueDate: "2026-03-06",
  },
  {
    id: "p2",
    title: "Follow up on 8(a) IRS verification status",
    domain: "Vorentoe",
    urgency: "high",
    dueDate: "2026-03-05",
  },
  {
    id: "p3",
    title: "Prepare SEAS IT sprint review slides",
    domain: "Skyward",
    urgency: "high",
    dueDate: "2026-03-07",
  },
  {
    id: "p4",
    title: "Review and respond to DHS RFP",
    domain: "Vorentoe",
    urgency: "medium",
    dueDate: "2026-03-10",
  },
  {
    id: "p5",
    title: "Prepare SAFe class materials for Thursday",
    domain: "Teaching",
    urgency: "medium",
    dueDate: "2026-03-06",
  },
];
