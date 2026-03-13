export interface OpportunityAttachment {
  name: string;
  url: string;
  type: string;
  addedAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  stage: string;
  valueUsd: number;
  probability: number;
  ownerAgent: string;
  ownerEmoji: string;
  shannonApproval: boolean | null;
  source: string;
  sourceUrl: string;
  sourceId: string;
  agency: string;
  deadline: string;
  description: string;
  solicitationNumber: string;
  setAsideType: string;
  naicsCodes: string[];
  fitScore: number;
  winThemes: string[];
  opsEngineAction: string;
  channel: string;
  attachments: OpportunityAttachment[];
}

export interface Application {
  id: string;
  title: string;
  stage: string;
  description: string;
  ownerAgent: string;
  ownerEmoji: string;
  dependenciesCount: number;
  shannonApproval: boolean | null;
}
