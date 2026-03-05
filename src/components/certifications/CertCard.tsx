"use client";

import { Certification, CertStatus } from "@/lib/mock-certifications";
import CertCountdown from "./CertCountdown";

interface CertCardProps {
  certification: Certification;
  onEdit?: () => void;
}

const statusConfig: Record<
  CertStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  NOT_STARTED: {
    label: "Not Started",
    color: "text-gray-400",
    bg: "bg-gray-500/10",
    border: "border-gray-500/30",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  SUBMITTED: {
    label: "Submitted",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
  APPROVED: {
    label: "Approved",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  EXPIRING: {
    label: "Expiring Soon",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  EXPIRED: {
    label: "Expired",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
};

export default function CertCard({ certification, onEdit }: CertCardProps) {
  const config =
    statusConfig[certification.status as CertStatus] ?? statusConfig.NOT_STARTED;
  const completedDocs = certification.documents.filter((d) => d.completed).length;
  const totalDocs = certification.documents.length;
  const progressPercent = totalDocs > 0 ? (completedDocs / totalDocs) * 100 : 0;

  return (
    <div
      role={onEdit ? "button" : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (onEdit && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onEdit();
        }
      }}
      className={`bg-gray-900 border border-gray-800 rounded-lg p-4 transition-colors ${
        onEdit ? "hover:border-cyan-500/50 cursor-pointer" : "hover:border-gray-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-gray-100">
            {certification.name}
          </h3>
          <p className="text-xs text-gray-500 font-mono">
            {certification.level} / {certification.authority}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <span className="text-xs text-gray-500">Click to edit</span>
          )}
          <span
          className={`${config.bg} ${config.border} ${config.color} border px-2 py-1 rounded text-xs font-medium`}
        >
          {config.label}
        </span>
        </div>
      </div>

      {/* Description */}
      {certification.description && (
        <p className="text-xs text-gray-400 mb-3">{certification.description}</p>
      )}

      {/* Countdown */}
      {certification.dueDate && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1 font-medium">
            Deadline:
          </div>
          <CertCountdown dueDate={certification.dueDate} />
        </div>
      )}

      {/* Document Checklist */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 font-medium">Documents</span>
          <span className="text-xs text-gray-400 font-mono">
            {completedDocs} / {totalDocs}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2">
          <div
            className="bg-cyan-500 h-1.5 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Document List */}
        <div className="space-y-1">
          {certification.documents.map((doc, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-xs text-gray-400"
            >
              <span className={doc.completed ? "text-green-400" : "text-gray-600"}>
                {doc.completed ? "✅" : "❌"}
              </span>
              <span className={doc.completed ? "line-through opacity-60" : ""}>
                {doc.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Notes preview */}
      {certification.notes && (
        <div className="mb-3 p-2 bg-gray-800/50 rounded border border-gray-700/50">
          <div className="text-xs text-gray-500 mb-1 font-medium">Notes</div>
          <p className="text-xs text-gray-400 line-clamp-2">
            {certification.notes}
          </p>
        </div>
      )}

      {/* Key Dates */}
      {(certification.appliedDate ||
        certification.decisionExpected ||
        certification.expiresDate) && (
        <div className="border-t border-gray-800 pt-3 mt-3 space-y-1">
          {certification.appliedDate && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Applied:</span>
              <span className="text-gray-400 font-mono">
                {new Date(certification.appliedDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {certification.decisionExpected && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Decision Expected:</span>
              <span className="text-gray-400 font-mono">
                {new Date(certification.decisionExpected).toLocaleDateString()}
              </span>
            </div>
          )}
          {certification.expiresDate && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Expires:</span>
              <span className="text-gray-400 font-mono">
                {new Date(certification.expiresDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
