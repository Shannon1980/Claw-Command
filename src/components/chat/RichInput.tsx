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
    // Re-focus input after sending
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = message.trim().length > 0;

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
        <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <span>{attachments.length} file{attachments.length > 1 ? "s" : ""} attached</span>
          <button onClick={() => setShowAttachments(true)} className="text-blue-500 hover:text-blue-400">edit</button>
        </div>
      )}

      {/* Input row - WhatsApp style */}
      <div className="flex items-end gap-2">
        {/* Attach button */}
        <button
          onClick={() => setShowAttachments(!showAttachments)}
          disabled={disabled}
          className={`p-2 rounded-full text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-colors shrink-0 ${
            showAttachments ? "text-blue-400" : ""
          }`}
          title="Attach files"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Textarea - rounded pill style */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={disabled ? "Select an agent to start chatting" : placeholder || "Type a message"}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700/40 rounded-2xl text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:border-gray-600 disabled:opacity-50 transition-colors"
            rows={1}
            maxLength={maxChars}
          />
        </div>

        {/* Send button - circular, WhatsApp style */}
        <button
          onClick={handleSend}
          disabled={!hasContent || disabled}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
            hasContent
              ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30"
              : "bg-gray-800 text-gray-500"
          }`}
          title="Send"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
            <path
              d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
