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
  const charCount = message.length;

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 4 * 24; // 4 lines * ~24px line height
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [message]);

  const insertFormatting = (prefix: string, suffix?: string) => {
    if (!textareaRef.current || disabled) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = message.substring(start, end);
    const actualSuffix = suffix || prefix;

    const newMessage =
      message.substring(0, start) +
      prefix +
      selectedText +
      actualSuffix +
      message.substring(end);

    setMessage(newMessage);

    // Restore cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = start + prefix.length + selectedText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

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
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-1">
        <button
          onClick={() => insertFormatting("**")}
          disabled={disabled}
          className="px-3 py-1.5 text-sm font-bold bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Bold"
        >
          B
        </button>
        <button
          onClick={() => insertFormatting("*")}
          disabled={disabled}
          className="px-3 py-1.5 text-sm italic bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Italic"
        >
          I
        </button>
        <button
          onClick={() => insertFormatting("`")}
          disabled={disabled}
          className="px-3 py-1.5 text-sm font-mono bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Code"
        >
          {"</>"}
        </button>
        <button
          onClick={() => setShowAttachments(!showAttachments)}
          disabled={disabled}
          className={`px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            showAttachments ? "bg-blue-600 hover:bg-blue-700" : ""
          }`}
          title="Attach files"
        >
          📎 Attach
        </button>
        {attachments.length > 0 && (
          <span className="text-xs text-gray-400 ml-2">
            {attachments.length} file{attachments.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* File attachment area */}
      {showAttachments && (
        <FileAttachment
          onFilesChange={setAttachments}
          disabled={disabled}
        />
      )}

      {/* Input area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "Select an agent to start chatting" : placeholder || "Type a message..."}
          className={`
            w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg
            text-gray-100 placeholder-gray-500 resize-none
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all
          `}
          rows={1}
          maxLength={maxChars}
        />
        <div className="absolute bottom-2 right-3 flex items-center gap-3">
          <span className={`text-xs ${charCount > maxChars * 0.9 ? "text-amber-400" : "text-gray-500"}`}>
            {charCount}/{maxChars}
          </span>
        </div>
      </div>

      {/* Send button */}
      <div className="flex justify-end">
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-700"
        >
          Send
        </button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500 text-center">
        Press <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
