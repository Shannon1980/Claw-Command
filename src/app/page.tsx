import CommandHeader from "@/components/command/CommandHeader";
import ActiveOperations from "@/components/command/ActiveOperations";
import DependenciesPanel from "@/components/command/DependenciesPanel";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <CommandHeader />
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Operations — 2/3 width */}
          <div className="lg:col-span-2">
            <h2 className="text-xs font-mono font-bold text-gray-500 tracking-widest uppercase mb-4">
              Active Operations
            </h2>
            <ActiveOperations />
          </div>

          {/* Dependencies Panel — 1/3 width */}
          <div className="lg:col-span-1">
            <DependenciesPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
