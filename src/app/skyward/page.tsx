import React from "react";
import WorkstreamCard from "@/components/skyward/WorkstreamCard";
import { getWorkstreams } from "@/lib/mock-workstreams";

export default function SkywardPage() {
  const workstreams = getWorkstreams();

  const onTrack = workstreams.filter((w) => w.status === "on_track").length;
  const atRisk = workstreams.filter((w) => w.status === "at_risk").length;
  const blocked = workstreams.filter((w) => w.status === "blocked").length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold">Skyward IT Solutions</h1>
            <span className="text-3xl">🌤️</span>
          </div>
          <p className="text-gray-400 text-lg mb-4">
            SEAS IT Program Workstreams
          </p>
          <div className="flex gap-4 text-sm">
            <div className="bg-green-900/20 border border-green-500 px-4 py-2 rounded-lg">
              <span className="text-green-400 font-semibold">
                {onTrack} On Track
              </span>
            </div>
            <div className="bg-amber-900/20 border border-amber-500 px-4 py-2 rounded-lg">
              <span className="text-amber-400 font-semibold">
                {atRisk} At Risk
              </span>
            </div>
            <div className="bg-red-900/20 border border-red-500 px-4 py-2 rounded-lg">
              <span className="text-red-400 font-semibold">{blocked} Blocked</span>
            </div>
          </div>
        </div>

        {/* Program Overview */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-3">Program Overview</h2>
          <p className="text-gray-300 mb-4">
            Shannon leads AI/ML program management for the CMS SEAS IT initiative,
            managing infrastructure modernization, security compliance, portal
            development, and data analytics capabilities.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500 mb-1">Program</div>
              <div className="text-gray-100 font-medium">
                CMS SEAS IT (Skyward)
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Role</div>
              <div className="text-gray-100 font-medium">
                Senior Program Manager
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Assigned To</div>
              <div className="text-gray-100 font-medium">Skylar 🌤️</div>
            </div>
          </div>
        </div>

        {/* Workstreams */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Active Workstreams</h2>
          <div className="space-y-4">
            {workstreams.map((workstream) => (
              <WorkstreamCard key={workstream.id} workstream={workstream} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
