"use client";

import {
  mockCertifications,
  getCertificationHealth,
} from "@/lib/mock-certifications";
import CertCard from "@/components/certifications/CertCard";

export default function CertificationsPage() {
  const health = getCertificationHealth();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-100">
              CERTIFICATION TRACKER
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              Federal, State, and Local certifications for Vorentoe LLC
            </p>
          </div>

          {/* Overall Health Indicator */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-500">Overall Health</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-green-400 text-xs font-mono">
                  {health.onTrack} on track
                </span>
                {health.atRisk > 0 && (
                  <span className="text-amber-400 text-xs font-mono">
                    {health.atRisk} at risk
                  </span>
                )}
                {health.critical > 0 && (
                  <span className="text-red-400 text-xs font-mono animate-pulse">
                    {health.critical} critical
                  </span>
                )}
              </div>
            </div>

            {/* Health Badge */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                health.critical > 0
                  ? "bg-red-500/20 border-2 border-red-500/50 animate-pulse"
                  : health.atRisk > 0
                  ? "bg-amber-500/20 border-2 border-amber-500/50"
                  : "bg-green-500/20 border-2 border-green-500/50"
              }`}
            >
              {health.critical > 0 ? "🚨" : health.atRisk > 0 ? "⚠️" : "✅"}
            </div>
          </div>
        </div>

        {/* Certification Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockCertifications.map((cert) => (
            <CertCard key={cert.id} certification={cert} />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <div className="text-xs text-gray-500 mb-2 font-medium">
            Status Legend
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-gray-500/10 border border-gray-500/30 text-gray-400 rounded">
                Not Started
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded">
                In Progress
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded">
                Submitted
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded">
                Approved
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded">
                Expiring Soon
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded">
                Expired
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
