'use client';

import { useState, useEffect } from 'react';
import { severityConfig } from '@/lib/ui-config';
import { formatDueDate } from '@/lib/utils/formatting';

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  trigger_type: string;
  due_date: string;
  created_at: string;
  dismissed_at: string | null;
  description?: string;
}

const severityOrder = { critical: 1, warning: 2, info: 3 };

export default function AlertsWidget() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts?active=true');
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      
      // Sort by severity (critical first), then by due date
      const sorted = list.sort((a: Alert, b: Alert) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
      
      setAlerts(sorted);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/dismiss`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId));
      }
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };


  if (isLoading) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
        <div className="text-gray-400">Loading alerts...</div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
        <div className="text-gray-400">No active alerts</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-900 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🚨</span>
          <h2 className="text-gray-100 font-semibold">Active Alerts</h2>
          <span className="px-2 py-1 bg-gray-800 text-gray-300 text-sm rounded-full">
            {alerts.length}
          </span>
        </div>
        <span className="text-gray-400 text-sm">
          {isCollapsed ? '▼' : '▲'}
        </span>
      </button>

      {/* Alert List */}
      {!isCollapsed && (
        <div className="border-t border-gray-800">
          {alerts.map((alert) => {
            const config = severityConfig[alert.severity];
            return (
              <div
                key={alert.id}
                className={`p-4 border-l-4 ${config.borderColor} ${config.bgColor} border-b border-gray-800 last:border-b-0`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Severity Badge & Title */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{config.emoji}</span>
                      <span className={`text-xs font-semibold uppercase ${config.color}`}>
                        {alert.severity}
                      </span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-gray-100 font-medium mb-1">
                      {alert.title}
                    </h3>
                    
                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="text-gray-500">Type:</span>
                        {(alert.trigger_type ?? "").replace(/_/g, " ")}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className={`font-medium ${
                        alert.due_date < new Date().toISOString().split('T')[0] 
                          ? 'text-red-400' 
                          : config.color
                      }`}>
                        {formatDueDate(alert.due_date)}
                      </span>
                    </div>
                    
                    {/* Description */}
                    {alert.description && (
                      <p className="mt-2 text-sm text-gray-400">
                        {alert.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Dismiss Button */}
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className="flex-shrink-0 px-3 py-1 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded transition-colors"
                    title="Dismiss alert"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
