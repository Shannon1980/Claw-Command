import type { DocumentPriority, ReviewStatus } from "@/lib/mock-docs";

export const priorityStyles: Record<
  DocumentPriority,
  { bg: string; border: string; color: string; dot: string }
> = {
  critical: { bg: "bg-red-500/10", border: "border-red-500/30", color: "text-red-400", dot: "bg-red-400" },
  high: { bg: "bg-orange-500/10", border: "border-orange-500/30", color: "text-orange-400", dot: "bg-orange-400" },
  medium: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", color: "text-yellow-400", dot: "bg-yellow-400" },
  low: { bg: "bg-gray-500/10", border: "border-gray-500/30", color: "text-gray-400", dot: "bg-gray-500" },
};

export const reviewStatusStyles: Record<
  ReviewStatus,
  { bg: string; color: string; border: string }
> = {
  pending_review: { bg: "bg-amber-500/10", color: "text-amber-400", border: "border-amber-500/30" },
  reviewed: { bg: "bg-blue-500/10", color: "text-blue-400", border: "border-blue-500/30" },
  needs_changes: { bg: "bg-orange-500/10", color: "text-orange-400", border: "border-orange-500/30" },
  approved: { bg: "bg-green-500/10", color: "text-green-400", border: "border-green-500/30" },
  rejected: { bg: "bg-red-500/10", color: "text-red-400", border: "border-red-500/30" },
};

export const categoryStyles: Record<string, string> = {
  govcon: "text-cyan-400 bg-cyan-500/10",
  internal: "text-gray-400 bg-gray-500/10",
  compliance: "text-amber-400 bg-amber-500/10",
  financial: "text-green-400 bg-green-500/10",
  technical: "text-blue-400 bg-blue-500/10",
  hr: "text-pink-400 bg-pink-500/10",
  marketing: "text-purple-400 bg-purple-500/10",
  legal: "text-red-400 bg-red-500/10",
  uncategorized: "text-gray-500 bg-gray-500/10",
};

export const severityConfig = {
  critical: {
    emoji: "🔴",
    color: "text-red-500",
    bgColor: "bg-red-950/50",
    borderColor: "border-red-900/50",
  },
  warning: {
    emoji: "🟡",
    color: "text-amber-500",
    bgColor: "bg-amber-950/50",
    borderColor: "border-amber-900/50",
  },
  info: {
    emoji: "ℹ️",
    color: "text-blue-500",
    bgColor: "bg-blue-950/50",
    borderColor: "border-blue-900/50",
  },
};
