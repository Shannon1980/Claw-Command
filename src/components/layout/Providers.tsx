"use client";

import { ReactNode } from "react";
import { GatewayProvider } from "@/lib/contexts/GatewayContext";
import ToastProvider from "@/components/notifications/ToastProvider";
import SyncTrigger from "./SyncTrigger";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GatewayProvider>
      <ToastProvider>
        <SyncTrigger />
        {children}
      </ToastProvider>
    </GatewayProvider>
  );
}
