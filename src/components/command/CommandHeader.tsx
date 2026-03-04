"use client";

import { useEffect, useState } from "react";

export default function CommandHeader() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZoneName: "short",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-bold text-black">
            CC
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-100">
              CLAW COMMAND
            </h1>
            <p className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">
              Vorentoe Mission Control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs font-mono text-gray-400">OPERATIONAL</span>
          </div>
          <span className="text-sm font-mono text-gray-400 tabular-nums">
            {time}
          </span>
        </div>
      </div>
    </header>
  );
}
