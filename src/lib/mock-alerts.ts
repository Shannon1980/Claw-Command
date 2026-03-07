// Mock alert data for Claw-Command
export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  trigger_type: string;
  due_date: string;
  created_at: string;
  dismissed_at: string | null;
  description?: string;
}

export const mockAlerts: Alert[] = [
  {
    id: 'alert-001',
    severity: 'critical',
    title: 'MBE Certification Deadline Approaching',
    trigger_type: 'certification_deadline',
    due_date: '2026-03-15',
    created_at: '2026-03-01T08:00:00Z',
    dismissed_at: null,
    description: 'MBE certification renewal required by March 15, 2026'
  },
  {
    id: 'alert-002',
    severity: 'warning',
    title: 'VA Pricing Review Overdue',
    trigger_type: 'pricing_review',
    due_date: '2026-03-10',
    created_at: '2026-03-02T10:30:00Z',
    dismissed_at: null,
    description: 'Quarterly pricing analysis for VA contracts pending'
  },
  {
    id: 'alert-003',
    severity: 'critical',
    title: 'DHS Solicitation Closing Soon',
    trigger_type: 'bid_deadline',
    due_date: '2026-03-08',
    created_at: '2026-03-03T14:00:00Z',
    dismissed_at: null,
    description: 'DHS-2026-001: IT Services solicitation closes March 8'
  },
  {
    id: 'alert-004',
    severity: 'info',
    title: 'Weekly Pipeline Review Scheduled',
    trigger_type: 'scheduled_review',
    due_date: '2026-03-06',
    created_at: '2026-03-04T09:00:00Z',
    dismissed_at: null,
    description: 'Weekly BD pipeline review with Bertha'
  },
  {
    id: 'alert-005',
    severity: 'warning',
    title: '8(a) Annual Review Documentation Due',
    trigger_type: 'compliance',
    due_date: '2026-03-20',
    created_at: '2026-03-01T11:00:00Z',
    dismissed_at: null,
    description: 'Submit annual business activity report to SBA'
  }
];

// Helper function to get active alerts
export function getActiveAlerts(): Alert[] {
  return mockAlerts.filter(alert => alert.dismissed_at === null);
}

