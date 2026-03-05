"use client";

import { useEffect } from "react";

export type ToastType = "success" | "warning" | "error" | "info" | "agent";

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  agentEmoji?: string;
  agentName?: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const ICONS: Record<ToastType, string> = {
  success: "✅",
  warning: "⚠️",
  error: "❌",
  info: "ℹ️",
  agent: "🤖",
};

const COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: {
    bg: "bg-green-900/90",
    border: "border-green-600",
    text: "text-green-100",
  },
  warning: {
    bg: "bg-amber-900/90",
    border: "border-amber-600",
    text: "text-amber-100",
  },
  error: {
    bg: "bg-red-900/90",
    border: "border-red-600",
    text: "text-red-100",
  },
  info: {
    bg: "bg-blue-900/90",
    border: "border-blue-600",
    text: "text-blue-100",
  },
  agent: {
    bg: "bg-purple-900/90",
    border: "border-purple-600",
    text: "text-purple-100",
  },
};

export default function Toast({ toast, onClose }: ToastProps) {
  const colors = COLORS[toast.type];
  const icon = toast.type === "agent" && toast.agentEmoji ? toast.agentEmoji : ICONS[toast.type];

  useEffect(() => {
    if (toast.duration !== 0) {
      const timeout = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration || 5000);

      return () => clearTimeout(timeout);
    }
  }, [toast.id, toast.duration, onClose]);

  return (
    <div
      className={`
        ${colors.bg} ${colors.border} ${colors.text}
        border rounded-lg shadow-2xl p-4 min-w-[320px] max-w-[420px]
        animate-slide-in-right backdrop-blur-sm
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-2xl flex-shrink-0">{icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Agent header for agent type */}
          {toast.type === "agent" && toast.agentName && (
            <div className="font-semibold text-sm mb-1">{toast.agentName}</div>
          )}

          {/* Title */}
          <div className="font-semibold">{toast.title}</div>

          {/* Description */}
          {toast.description && (
            <div className="text-sm opacity-90 mt-1">{toast.description}</div>
          )}

          {/* Action button */}
          {toast.actionLabel && toast.onAction && (
            <button
              onClick={toast.onAction}
              className="mt-3 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => onClose(toast.id)}
          className="text-white/70 hover:text-white transition-colors flex-shrink-0"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
