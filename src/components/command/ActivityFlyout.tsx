"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import ActivityFeed from "./ActivityFeed";

interface ActivityFlyoutProps {
  /** Optional badge count to show on trigger */
  badgeCount?: number;
}

export default function ActivityFlyout({ badgeCount }: ActivityFlyoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-gray-800/60 transition-colors"
        aria-label="Open activity feed"
      >
        <span className="text-base">📡</span>
        <span>Activity</span>
        {badgeCount != null && badgeCount > 0 && (
          <span className="px-1.5 py-0.5 text-xs bg-blue-500/30 text-blue-300 rounded-full min-w-[1.25rem] text-center">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>

      {/* Portal flyout to body - ensures it renders above all content */}
      {isOpen &&
        mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/60"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
              style={{ zIndex: 9998 }}
            />
            <div
              className="fixed top-0 right-0 h-full w-full max-w-md bg-gray-950 border-l border-gray-800 shadow-2xl transform transition-transform duration-300 ease-out translate-x-0"
              aria-modal="true"
              aria-label="Activity feed"
              style={{ zIndex: 9999 }}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
                  <h2 className="text-lg font-semibold text-gray-100">
                    Activity Feed
                  </h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
                    aria-label="Close"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                  <ActivityFeed fillHeight />
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
