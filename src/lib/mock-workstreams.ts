export type WorkstreamStatus = "on_track" | "at_risk" | "blocked";

export interface Milestone {
  id: string;
  name: string;
  date: string;
  completed: boolean;
}

export interface Workstream {
  id: string;
  name: string;
  status: WorkstreamStatus;
  description: string;
  owner: string;
  milestones: Milestone[];
  riskFactors?: string[];
}
