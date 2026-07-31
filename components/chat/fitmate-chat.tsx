"use client";

import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useChatStore } from "@/store/chat-store";
import { sendMessage } from "@/lib/api";
import { getOrCreateUuid } from "@/lib/conversation-mapping";
import ChatHeader from "./chat-header";
import ChatWelcome from "./chat-welcome";
import ChatMessages from "./chat-messages";
import ChatInput from "./chat-input";

/**
 * FitMateChat — Main chat orchestrator.
 *
 * Two visual states:
 *   A) Empty/Welcome: centered title + large input in viewport center
 *   B) Active Chat: messages scroll above, compact input docked at bottom
 *
 * Animated transition between states via framer-motion layout animations.
 */
export default function FitMateChat() {
  const [input, setInput] = useState("");
  const router = useRouter();

  const { profile } = useOnboardingStore();
  const {
    messages,
    isLoading,
    conversationId,
    addUserMessage,
    addAssistantMessage,
    addErrorMessage,
    setLoading,
    setConversationId,
    removeLastAssistantMessage,
    updateMessageContent,
  } = useChatStore();

  const hasMessages = messages.length > 0;

  // ── Abort controller for cancelling in-flight requests ──
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Cancel current response ────────────────────
  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  // ── Send a message ─────────────────────────────
  const handleSend = useCallback(
    async (text?: string) => {
      const messageText = (text ?? input).trim();
      if (!messageText || isLoading) return;

      const userId = useOnboardingStore.getState().userId;
      if (!userId) return;

      addUserMessage(messageText);
      setInput("");

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setLoading(true);

      try {
        const result = await sendMessage(
          userId,
          messageText,
          conversationId,
          controller.signal
        );

        if (result.conversation_id && !conversationId) {
          setConversationId(result.conversation_id);
          // Update URL to include conversation UUID
          const uuid = getOrCreateUuid(result.conversation_id);
          router.push(`/chat/${uuid}`, { scroll: false });
        }

        addAssistantMessage(result.response);
      } catch (err) {
        // User cancelled — don't show error, just stop loading
        if (err instanceof DOMException && err.name === "AbortError") return;
        addErrorMessage();
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [
      input,
      isLoading,
      conversationId,
      addUserMessage,
      addAssistantMessage,
      addErrorMessage,
      setLoading,
      setConversationId,
      router,
    ]
  );

  // ── Regenerate last response ───────────────────
  const handleRegenerate = useCallback(async () => {
    if (isLoading) return;

    const userId = useOnboardingStore.getState().userId;
    if (!userId) return;

    // Find the last user message to re-send
    const lastUserMsg = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUserMsg) return;

    // Remove the last assistant message
    removeLastAssistantMessage();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);

    try {
      const result = await sendMessage(
        userId,
        lastUserMsg.content,
        conversationId,
        controller.signal
      );

      addAssistantMessage(result.response);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      addErrorMessage();
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    isLoading,
    messages,
    conversationId,
    removeLastAssistantMessage,
    addAssistantMessage,
    addErrorMessage,
    setLoading,
  ]);

  // ── Keyboard handler ───────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ─────────────────────────────────────
  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <ChatHeader />

      {/* Content area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!hasMessages ? (
            /* ── State A: Welcome — centered ──────── */
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <ChatWelcome name={profile.name} />

              {/* Large input — centered below title */}
              <div className="mt-8 w-full">
                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSend={() => handleSend()}
                  onCancel={handleCancel}
                  onKeyDown={handleKeyDown}
                  isLoading={isLoading}
                  isCompact={false}
                />
              </div>
            </motion.div>
          ) : (
            /* ── State B: Active Chat ─────────────── */
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Messages scroll area */}
              <ChatMessages
                messages={messages}
                isLoading={isLoading}
                onRegenerate={handleRegenerate}
              />

              {/* Compact input — docked at bottom */}
              <div className="shrink-0 bg-background/80 backdrop-blur-lg pt-2 pb-3">
                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSend={() => handleSend()}
                  onCancel={handleCancel}
                  onKeyDown={handleKeyDown}
                  isLoading={isLoading}
                  isCompact={true}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
