// Mock activity data for Vorentoe Command Center
export interface Activity {
  id: string;
  agent_name: string;
  agent_emoji: string;
  event_type: 'task_started' | 'task_completed' | 'approval_requested' | 'alert_created' | 'opportunity_added' | 'document_generated' | 'research_completed' | 'meeting_scheduled';
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export const mockActivities: Activity[] = [
  {
    id: 'act-001',
    agent_name: 'Bertha',
    agent_emoji: '💼',
    event_type: 'opportunity_added',
    description: 'Added new opportunity: DHS IT Services RFP',
    timestamp: '2026-03-04T14:45:00Z',
    metadata: { opportunity_id: 'opp-123', value: '$2.5M' }
  },
  {
    id: 'act-002',
    agent_name: 'Veronica',
    agent_emoji: '🎯',
    event_type: 'alert_created',
    description: 'Created alert: MBE Certification Deadline',
    timestamp: '2026-03-04T13:30:00Z',
    metadata: { alert_id: 'alert-001', severity: 'critical' }
  },
  {
    id: 'act-003',
    agent_name: 'Forge',
    agent_emoji: '⚙️',
    event_type: 'task_completed',
    description: 'Deployed Claw-Command dashboard updates',
    timestamp: '2026-03-04T12:15:00Z',
    metadata: { pr_number: 4, branch: 'feature/agent-status-panels' }
  },
  {
    id: 'act-004',
    agent_name: 'Depa',
    agent_emoji: '📊',
    event_type: 'research_completed',
    description: 'Completed competitive analysis for VA contracts',
    timestamp: '2026-03-04T11:00:00Z',
    metadata: { report_id: 'rpt-045', competitors: 8 }
  },
  {
    id: 'act-005',
    agent_name: 'Bob',
    agent_emoji: '🤖',
    event_type: 'approval_requested',
    description: 'Approval needed: Send proposal to GSA contact',
    timestamp: '2026-03-04T10:30:00Z',
    metadata: { proposal_id: 'prop-089', contact: 'Sarah Johnson' }
  },
  {
    id: 'act-006',
    agent_name: 'Muse',
    agent_emoji: '🎨',
    event_type: 'document_generated',
    description: 'Generated capability statement for 8(a) opportunities',
    timestamp: '2026-03-04T09:45:00Z',
    metadata: { document_type: 'capability_statement', format: 'pdf' }
  },
  {
    id: 'act-007',
    agent_name: 'Skylar',
    agent_emoji: '🌤️',
    event_type: 'task_started',
    description: 'Started weekly SEAS IT status report',
    timestamp: '2026-03-04T09:00:00Z',
    metadata: { report_week: '2026-W10' }
  },
  {
    id: 'act-008',
    agent_name: 'Peter',
    agent_emoji: '📋',
    event_type: 'meeting_scheduled',
    description: 'Scheduled sprint planning for Vorentoe apps',
    timestamp: '2026-03-04T08:30:00Z',
    metadata: { meeting_date: '2026-03-06', attendees: ['Shannon', 'Forge', 'Muse'] }
  },
  {
    id: 'act-009',
    agent_name: 'Bertha',
    agent_emoji: '💼',
    event_type: 'task_completed',
    description: 'Updated pipeline: 3 new leads added to tracking',
    timestamp: '2026-03-04T08:00:00Z',
    metadata: { leads_added: 3, total_pipeline_value: '$8.2M' }
  },
  {
    id: 'act-010',
    agent_name: 'Harmony',
    agent_emoji: '👥',
    event_type: 'task_completed',
    description: 'Confirmed PTA volunteer schedule for March events',
    timestamp: '2026-03-03T16:30:00Z',
    metadata: { events: ['Science Fair', 'Book Fair', 'Spring Fundraiser'] }
  },
  {
    id: 'act-011',
    agent_name: 'Sentinel',
    agent_emoji: '🛡️',
    event_type: 'task_completed',
    description: 'Completed security audit for Claw-Command repository',
    timestamp: '2026-03-03T15:00:00Z',
    metadata: { issues_found: 0, status: 'passed' }
  },
  {
    id: 'act-012',
    agent_name: 'Depa',
    agent_emoji: '📊',
    event_type: 'task_started',
    description: 'Analyzing GSA Schedule pricing trends Q1 2026',
    timestamp: '2026-03-03T14:00:00Z',
    metadata: { data_sources: 3, schedule: 'GSA MAS' }
  },
  {
    id: 'act-013',
    agent_name: 'Bob',
    agent_emoji: '🤖',
    event_type: 'task_completed',
    description: 'Generated daily brief for Shannon',
    timestamp: '2026-03-03T07:00:00Z',
    metadata: { priorities: 5, alerts: 3 }
  }
];

// Helper function to get recent activities
export function getRecentActivities(limit: number = 50): Activity[] {
  return mockActivities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

// Helper function to filter by agent
export function getActivitiesByAgent(agentName: string): Activity[] {
  return mockActivities
    .filter(activity => activity.agent_name.toLowerCase() === agentName.toLowerCase())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Helper function to filter by event type
export function getActivitiesByType(eventType: Activity['event_type']): Activity[] {
  return mockActivities
    .filter(activity => activity.event_type === eventType)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
