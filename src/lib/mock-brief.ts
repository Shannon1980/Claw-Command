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
