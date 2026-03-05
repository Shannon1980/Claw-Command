"use client";

import { useState, useRef } from "react";

interface AttachmentFile {
  name: string;
  type: string;
  size: number;
}

interface FileAttachmentProps {
  onFilesChange: (files: AttachmentFile[]) => void;
  disabled?: boolean;
}

const FILE_ICONS: Record<string, string> = {
  pdf: "📄",
  md: "📝",
  txt: "📝",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
  doc: "📘",
  docx: "📘",
};

const SUPPORTED_TYPES = [".md", ".txt", ".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function FileAttachment({ onFilesChange, disabled }: FileAttachmentProps) {
  const [files, setFiles] = useState<AttachmentFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    return FILE_ICONS[ext] || "📎";
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) return;

    const newFiles: AttachmentFile[] = Array.from(fileList)
      .filter((file) => {
        const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
        return SUPPORTED_TYPES.includes(ext) && file.size <= MAX_FILE_SIZE;
      })
      .map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      }));

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
            >
              <span className="text-lg">{getFileIcon(file.name)}</span>
              <div className="flex flex-col">
                <span className="text-gray-200 font-medium">{file.name}</span>
                <span className="text-gray-500 text-xs">{formatFileSize(file.size)}</span>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="ml-2 text-gray-400 hover:text-red-400 transition-colors"
                disabled={disabled}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / Upload button */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all
          ${isDragging ? "border-blue-500 bg-blue-500/10" : "border-gray-700 hover:border-gray-600"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_TYPES.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl">📎</span>
          <p className="text-sm text-gray-400">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-gray-500">
            Supported: {SUPPORTED_TYPES.join(", ")} • Max {formatFileSize(MAX_FILE_SIZE)}
          </p>
        </div>
      </div>
    </div>
  );
}
