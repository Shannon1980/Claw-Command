"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { ToastData, ToastType } from "@/components/notifications/Toast";

interface AddToastOptions {
  type: ToastType;
  title: string;
  description?: string;
  agentEmoji?: string;
  agentName?: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number; // 0 = no auto-dismiss
}

interface ToastContextType {
  toasts: ToastData[];
  addToast: (options: AddToastOptions) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToastsState() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((options: AddToastOptions) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastData = {
      id,
      ...options,
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

export function useToasts() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToasts must be used within a ToastProvider");
  }
  return context;
}

export { ToastContext };
export type { AddToastOptions, ToastContextType };
