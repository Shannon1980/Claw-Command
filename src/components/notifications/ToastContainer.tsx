"use client";

import Toast, { ToastData } from "./Toast";

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  // Show max 5 toasts, newest on top
  const visibleToasts = toasts.slice(-5).reverse();

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {visibleToasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}
