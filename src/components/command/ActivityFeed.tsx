'use client';

import { useState, useEffect, useRef } from 'react';

interface Activity {
  id: string;
  agent_name: string;
  agent_emoji: string;
  event_type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const eventTypeColors: Record<string, string> = {
  task_started: 'text-blue-400',
  task_completed: 'text-green-400',
  approval_requested: 'text-amber-400',
  alert_created: 'text-red-400',
  opportunity_added: 'text-purple-400',
  document_generated: 'text-cyan-400',
  research_completed: 'text-indigo-400',
  meeting_scheduled: 'text-pink-400'
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    // Filter activities when filters change
    let filtered = [...activities];
    
    if (selectedAgent) {
      filtered = filtered.filter(a => a.agent_name === selectedAgent);
    }
    
    if (selectedEventType) {
      filtered = filtered.filter(a => a.event_type === selectedEventType);
    }
    
    setFilteredActivities(filtered);
  }, [activities, selectedAgent, selectedEventType]);

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities?limit=50');
      const data = await response.json();
      setActivities(data);
      setFilteredActivities(data);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get unique agents and event types for filters
  const uniqueAgents = Array.from(new Set(activities.map(a => a.agent_name))).sort();
  const uniqueEventTypes = Array.from(new Set(activities.map(a => a.event_type))).sort();

  if (isLoading) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
        <div className="text-gray-400">Loading activity feed...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header with Filters */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">📡</span>
            <h2 className="text-gray-100 font-semibold">Activity Feed</h2>
            <span className="px-2 py-1 bg-gray-800 text-gray-300 text-sm rounded-full">
              {filteredActivities.length}
            </span>
          </div>
        </div>

        {/* Filter Toggles */}
        <div className="flex flex-wrap gap-3">
          {/* Agent Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 uppercase">Agent:</label>
            <select
              value={selectedAgent || ''}
              onChange={(e) => setSelectedAgent(e.target.value || null)}
              className="bg-gray-900 border border-gray-700 text-gray-100 text-sm rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Agents</option>
              {uniqueAgents.map(agent => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 uppercase">Event:</label>
            <select
              value={selectedEventType || ''}
              onChange={(e) => setSelectedEventType(e.target.value || null)}
              className="bg-gray-900 border border-gray-700 text-gray-100 text-sm rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Events</option>
              {uniqueEventTypes.map(type => (
                <option key={type} value={type}>{formatEventType(type)}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(selectedAgent || selectedEventType) && (
            <button
              onClick={() => {
                setSelectedAgent(null);
                setSelectedEventType(null);
              }}
              className="text-xs text-gray-400 hover:text-gray-100 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Activity List */}
      <div 
        ref={feedRef}
        className="max-h-[600px] overflow-y-auto"
      >
        {filteredActivities.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No activities found{(selectedAgent || selectedEventType) && ' with current filters'}.
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="px-4 py-3 border-b border-gray-800 last:border-b-0 hover:bg-gray-900/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Agent Emoji */}
                <span className="text-2xl flex-shrink-0">{activity.agent_emoji}</span>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-100 font-medium">{activity.agent_name}</span>
                    <span className="text-gray-600">•</span>
                    <span className={`text-xs font-semibold uppercase ${eventTypeColors[activity.event_type] || 'text-gray-400'}`}>
                      {formatEventType(activity.event_type)}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-1">
                    {activity.description}
                  </p>
                  
                  {/* Metadata */}
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(activity.metadata).map(([key, value]) => (
                        <span 
                          key={key}
                          className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded"
                        >
                          {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Timestamp */}
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatTimestamp(activity.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
