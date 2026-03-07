"use client";

import { useState, useRef, useEffect } from "react";
import FileAttachment from "./FileAttachment";

export interface AttachmentFile {
  name: string;
  type: string;
  size: number;
}

interface RichInputProps {
  onSend: (message: string, attachments: AttachmentFile[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function RichInput({ onSend, disabled, placeholder }: RichInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const maxChars = 5000;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 5 * 24;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (!message.trim() || disabled) return;
    onSend(message, attachments);
    setMessage("");
    setAttachments([]);
    setShowAttachments(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-2">
      {/* File attachment area */}
      {showAttachments && (
        <FileAttachment
          onFilesChange={setAttachments}
          disabled={disabled}
        />
      )}

      {/* Attachments indicator */}
      {attachments.length > 0 && !showAttachments && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{attachments.length} file{attachments.length > 1 ? "s" : ""} attached</span>
          <button onClick={() => setShowAttachments(true)} className="text-blue-500 hover:text-blue-400">edit</button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Attach button */}
        <button
          onClick={() => setShowAttachments(!showAttachments)}
          disabled={disabled}
          className={`p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors shrink-0 ${
            showAttachments ? "text-blue-400" : ""
          }`}
          title="Attach files"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={disabled ? "Select an agent to start chatting" : placeholder || "Type a message..."}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-sm text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 transition-colors"
            rows={1}
            maxLength={maxChars}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-30 disabled:hover:bg-blue-600 shrink-0"
          title="Send"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
