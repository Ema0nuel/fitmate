"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/store/chat-store";
import ChatBubbleActions from "./chat-bubble-actions";

// ═══════════════════════════════════════════════════
// Typing indicator — three pulsing dots
// ═══════════════════════════════════════════════════

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
          style={{
            animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes pulse-dot {
          0%,
          80%,
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          40% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Chat Bubble
// ═══════════════════════════════════════════════════

function ChatBubble({
  message,
  isLastMessage,
  onRegenerate,
}: {
  message: ChatMessage;
  isLastMessage: boolean;
  onRegenerate?: () => void;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "group flex w-full animate-[fadeUp_0.15s_ease]",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn("max-w-[85%]", isUser ? "items-end" : "items-start", "flex flex-col")}>
        <div
          className={cn(
            "px-4 py-3",
            isUser
              ? "rounded-xl bg-primary text-primary-foreground"
              : "rounded-xl bg-muted text-foreground"
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>

        {/* Hover actions */}
        <ChatBubbleActions
          role={message.role}
          content={message.content}
          messageId={message.id}
          isLastMessage={isLastMessage}
          onRegenerate={onRegenerate}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ChatMessages — scrollable message list with fade edges
// ═══════════════════════════════════════════════════

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onRegenerate?: () => void;
}

export default function ChatMessages({ messages, isLoading, onRegenerate }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Find the last assistant message index for regenerate button
  const lastAssistantIdx = messages.findLastIndex((m) => m.role === "assistant");

  return (
    <div className="flex-1 overflow-y-auto chat-scroll relative">
      {/* Top fade — blends messages into header */}
      <div
        className="sticky top-0 left-0 right-0 h-8 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, var(--background) 0%, transparent 100%)",
        }}
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-2 pb-[16vh]">
        {messages.map((msg, idx) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            isLastMessage={idx === lastAssistantIdx}
            onRegenerate={onRegenerate}
          />
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-muted px-4 py-3">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom fade — blends messages into input area */}
      <div
        className="sticky bottom-0 left-0 right-0 h-12 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to top, var(--background) 0%, transparent 100%)",
        }}
      />

      {/* Global keyframes for bubble animation */}
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
