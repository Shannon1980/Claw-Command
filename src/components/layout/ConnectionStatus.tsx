"use client";

import { useGatewayUpdates } from "@/lib/hooks/useGatewayUpdates";
import { useGatewayContext } from "@/lib/contexts/GatewayContext";

export default function ConnectionStatus() {
  // Activate connection updates
  useGatewayUpdates();
  
  const gateway = useGatewayContext();
  const status = gateway.state.connection;
  const error = gateway.state.error;

  const config = {
    connected: { color: "bg-green-500", glow: "shadow-green-500/50", label: "Live" },
    reconnecting: { color: "bg-yellow-500", glow: "shadow-yellow-500/50", label: "Reconnecting" },
    disconnected: { color: "bg-gray-500", glow: "", label: "Offline" },
    error: { color: "bg-red-500", glow: "shadow-red-500/50", label: "Error" },
  }[status] || { color: "bg-gray-500", glow: "", label: "Unknown" };

  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-full border border-gray-800 text-xs font-mono"
      title={error?.message}
    >
      <span className={`relative flex h-2 w-2`}>
        {status === "connected" && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color}`} />
      </span>
      <span className="text-gray-400 font-medium tracking-wide uppercase text-[10px]">
        {config.label}
      </span>
    </div>
  );
}
