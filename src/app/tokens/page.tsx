"use client";

export default function TokensPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">📊 Token & Cost Tracking</h1>
        <p className="text-gray-400 mb-6">
          Mission Control–style token usage and cost analysis.
        </p>
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🔌</div>
          <h2 className="text-lg font-medium text-gray-300 mb-2">
            Coming soon
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Token tracking requires OpenClaw gateway integration to collect usage data per session.
            Connect your OpenClaw instance to enable cost analysis and per-model breakdowns.
          </p>
        </div>
      </div>
    </div>
  );
}
