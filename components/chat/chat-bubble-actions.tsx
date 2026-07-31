"use client";

import { useState } from "react";
import { Copy, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ChatBubbleActions — hover actions for chat messages.
 *
 * Assistant messages: Copy + Regenerate (last message only)
 * User messages: Copy only
 *
 * Uses group-hover for show/hide pattern.
 */
interface ChatBubbleActionsProps {
  role: "user" | "assistant";
  content: string;
  messageId: string;
  isLastMessage?: boolean;
  onRegenerate?: () => void;
}

export default function ChatBubbleActions({
  role,
  content,
  messageId,
  isLastMessage = false,
  onRegenerate,
}: ChatBubbleActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 transition-opacity duration-150",
        "group-hover:opacity-100",
        role === "user" ? "justify-end mt-1" : "justify-start mt-1"
      )}
    >
      {/* Copy */}
      <button
        onClick={handleCopy}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md",
          "text-muted-foreground/60 hover:text-foreground hover:bg-muted/80",
          "transition-[color,background-color] duration-150 ease-out",
          "cursor-pointer"
        )}
        aria-label="Copy message"
        title="Copy"
      >
        {copied ? (
          <Check className="h-3 w-3" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>

      {/* Regenerate — only on last assistant message */}
      {role === "assistant" && isLastMessage && onRegenerate && (
        <button
          onClick={onRegenerate}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md",
            "text-muted-foreground/60 hover:text-foreground hover:bg-muted/80",
            "transition-[color,background-color] duration-150 ease-out",
            "cursor-pointer"
          )}
          aria-label="Regenerate response"
          title="Regenerate"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
