"use client";

import { useState } from "react";
import { Certification, CertStatus } from "@/lib/certifications/model";

const STATUS_OPTIONS: { value: CertStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "EXPIRING", label: "Expiring Soon" },
  { value: "EXPIRED", label: "Expired" },
];

interface CertEditModalProps {
  certification: Certification;
  onSave: (cert: Certification) => void;
  onClose: () => void;
}

export default function CertEditModal({
  certification,
  onSave,
  onClose,
}: CertEditModalProps) {
  const [form, setForm] = useState<Certification>({ ...certification });

  const handleStatusChange = (status: CertStatus) => {
    setForm((prev) => ({ ...prev, status }));
  };

  const handleDocumentToggle = (index: number) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.map((d, i) =>
        i === index ? { ...d, completed: !d.completed } : d
      ),
    }));
  };

  const handleDocumentRename = (index: number, name: string) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.map((d, i) =>
        i === index ? { ...d, name } : d
      ),
    }));
  };

  const handleAddDocument = () => {
    setForm((prev) => ({
      ...prev,
      documents: [...prev.documents, { name: "New document", completed: false }],
    }));
  };

  const handleRemoveDocument = (index: number) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const handleDateChange = (
    field: "dueDate" | "appliedDate" | "decisionExpected" | "expiresDate",
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const handleNotesChange = (notes: string) => {
    setForm((prev) => ({ ...prev, notes }));
  };

  const handleDescriptionChange = (description: string) => {
    setForm((prev) => ({ ...prev, description: description || undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-100">
            Edit {certification.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Status */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => handleStatusChange(e.target.value as CertStatus)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Key Dates */}
          <div className="mb-4 space-y-3">
            <div className="text-xs font-medium text-gray-500 mb-2">
              Key Dates
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={form.dueDate ?? ""}
                  onChange={(e) => handleDateChange("dueDate", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Applied Date
                </label>
                <input
                  type="date"
                  value={form.appliedDate ?? ""}
                  onChange={(e) =>
                    handleDateChange("appliedDate", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Decision Expected
                </label>
                <input
                  type="date"
                  value={form.decisionExpected ?? ""}
                  onChange={(e) =>
                    handleDateChange("decisionExpected", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Expires Date
                </label>
                <input
                  type="date"
                  value={form.expiresDate ?? ""}
                  onChange={(e) =>
                    handleDateChange("expiresDate", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">
                Documents
              </label>
              <button
                type="button"
                onClick={handleAddDocument}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                + Add document
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {form.documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-gray-800/50 rounded border border-gray-700/50"
                >
                  <input
                    type="checkbox"
                    checked={doc.completed}
                    onChange={() => handleDocumentToggle(idx)}
                    className="rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <input
                    type="text"
                    value={doc.name}
                    onChange={(e) =>
                      handleDocumentRename(idx, e.target.value)
                    }
                    className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    placeholder="Document name"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(idx)}
                    className="text-gray-500 hover:text-red-400 p-1 text-xs"
                    aria-label="Remove"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Description
            </label>
            <input
              type="text"
              value={form.description ?? ""}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Brief description or context"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-gray-500"
            />
          </div>

          {/* Notes / Comments */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Notes / Comments
            </label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes, reminders, or comments..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-gray-500 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-800 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 transition-colors text-sm font-medium"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
