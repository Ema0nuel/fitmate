"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUp, Pause } from "lucide-react";

// ═══════════════════════════════════════════════════
// Auto-resize textarea hook
// ═══════════════════════════════════════════════════

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: {
  minHeight: number;
  maxHeight?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

// ═══════════════════════════════════════════════════
// ChatInput — Dynamic Island style
// Compact by default, grows smoothly with content
// ═══════════════════════════════════════════════════

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  isCompact: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  onCancel,
  onKeyDown,
  isLoading,
  isCompact,
}: ChatInputProps) {
  const minHeight = isCompact ? 40 : 60;

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight: 140,
  });

  // Reset height when switching modes or when value is cleared
  useEffect(() => {
    adjustHeight(true);
  }, [isCompact, adjustHeight]);

  // Reset when value is cleared
  useEffect(() => {
    if (!value) {
      adjustHeight(true);
    }
  }, [value, adjustHeight]);

  return (
    <motion.div
      layout
      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
      className={cn(
        "w-full max-w-2xl mx-auto",
        isCompact ? "px-3" : "px-4"
      )}
    >
      <div
        className={cn(
          "relative bg-muted/50 border border-transparent rounded-2xl",
          "transition-[border-color,background-color,box-shadow] duration-200 ease-out",
          "focus-within:border-primary/20 focus-within:bg-muted",
          "shadow-sm focus-within:shadow-md",
          isLoading && "opacity-80"
        )}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            adjustHeight();
          }}
          onKeyDown={onKeyDown}
          placeholder={isCompact ? "Ask FitMate..." : "Ask FitMate anything about fitness..."}
          rows={1}
          className={cn(
            "w-full px-4 py-2.5 resize-none border-none",
            "bg-transparent text-foreground text-sm",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "placeholder:text-muted-foreground",
            isCompact ? "min-h-9" : "min-h-13"
          )}
          style={{ overflow: "hidden" }}
        />

        {/* Send / Pause button — bottom right inside card */}
        <div className="flex items-center justify-end px-2 pb-1.5 pt-0">
          <Button
            size="icon"
            onClick={isLoading ? onCancel : onSend}
            disabled={!value.trim() && !isLoading}
            aria-label={isLoading ? "Stop generating" : "Send message"}
            className={cn(
              "h-7 w-7 rounded-full",
              "transition-[background-color,transform,box-shadow] duration-160 ease-out",
              isLoading
                ? "bg-foreground text-background hover:bg-foreground/90 shadow-sm btn-press scale-100 cursor-pointer"
                : value.trim()
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 btn-press scale-100"
                  : "bg-border/80 text-muted-foreground/50 cursor-default scale-95"
            )}
          >
            {isLoading ? (
              <Pause className="h-3.5 w-3.5" strokeWidth={2.5} />
            ) : (
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
          </Button>
        </div>
      </div>

      {/* Disclaimer — only in compact mode */}
      {isCompact && (
        <p className="mt-1.5 text-center text-xs text-muted-foreground/40 leading-tight">
          FitMate provides general fitness guidance, not medical advice.
        </p>
      )}
    </motion.div>
  );
}
