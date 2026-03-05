"use client";

import { ReactNode } from "react";
import { GatewayProvider } from "@/lib/contexts/GatewayContext";
import ToastProvider from "@/components/notifications/ToastProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GatewayProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </GatewayProvider>
  );
}
