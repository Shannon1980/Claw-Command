"use client";

import { useEventStream } from "@/lib/hooks/useEventStream";

export function EventStreamProvider({ children }: { children: React.ReactNode }) {
  useEventStream();
  return <>{children}</>;
}
