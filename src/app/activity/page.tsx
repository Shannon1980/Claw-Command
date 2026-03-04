import ActivityFeed from '@/components/command/ActivityFeed';

export default function ActivityPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            Activity Log
          </h1>
          <p className="text-gray-400">
            Real-time updates from all Vorentoe Command agents
          </p>
        </div>

        {/* Activity Feed */}
        <ActivityFeed />

        {/* Info Panel */}
        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-3">
            About the Activity Feed
          </h2>
          <div className="space-y-2 text-sm text-gray-400">
            <p>
              The Activity Feed tracks all actions taken by Vorentoe Command agents in real-time. 
              Use filters to focus on specific agents or event types.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <h3 className="text-gray-300 font-medium mb-2">Event Types:</h3>
                <ul className="space-y-1 text-xs">
                  <li className="text-blue-400">• Task Started</li>
                  <li className="text-green-400">• Task Completed</li>
                  <li className="text-amber-400">• Approval Requested</li>
                  <li className="text-red-400">• Alert Created</li>
                </ul>
              </div>
              <div>
                <h3 className="text-gray-300 font-medium mb-2">More Types:</h3>
                <ul className="space-y-1 text-xs">
                  <li className="text-purple-400">• Opportunity Added</li>
                  <li className="text-cyan-400">• Document Generated</li>
                  <li className="text-indigo-400">• Research Completed</li>
                  <li className="text-pink-400">• Meeting Scheduled</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
