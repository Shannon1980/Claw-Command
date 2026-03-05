"use client";

import { ReactNode } from "react";
import { ToastContext, useToastsState } from "@/lib/hooks/useToasts";
import { useNotifications } from "@/lib/hooks/useNotifications";
import ToastContainer from "./ToastContainer";

interface ToastProviderProps {
  children: ReactNode;
}

function NotificationPoller() {
  useNotifications();
  return null;
}

export default function ToastProvider({ children }: ToastProviderProps) {
  const { toasts, addToast, removeToast } = useToastsState();

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      <NotificationPoller />
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}
