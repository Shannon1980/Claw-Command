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
