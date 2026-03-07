"use client";

import { ReactNode } from "react";
import { GatewayProvider } from "@/lib/contexts/GatewayContext";
import ToastProvider from "@/components/notifications/ToastProvider";
import { useEventStream } from "@/lib/hooks/useEventStream";
import SyncTrigger from "./SyncTrigger";

function EventStreamInit() {
  useEventStream();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GatewayProvider>
      <ToastProvider>
        <SyncTrigger />
        <EventStreamInit />
        {children}
      </ToastProvider>
    </GatewayProvider>
  );
}
