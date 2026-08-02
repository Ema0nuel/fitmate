"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useChatStore, type ChatMessage } from "@/store/chat-store";
import { getConversationDetail } from "@/lib/api";
import { resolveConversationId } from "@/lib/conversation-mapping";
import FitMateChat from "@/components/chat/fitmate-chat";

/**
 * /chat/[conversationId] — Existing conversation page
 *
 * Loads conversation history from the DB, hydrates the chat store,
 * and renders the chat interface.
 */
export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const urlParam = params.conversationId as string;

  // Resolve UUID from URL to backend numeric ID
  const conversationId = resolveConversationId(urlParam);

  const { userId, _hasHydrated } = useOnboardingStore();
  const { loadMessages, messages } = useChatStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Redirect to onboarding if user never completed it
  useEffect(() => {
    if (_hasHydrated && !userId) {
      router.replace("/onboarding");
    }
  }, [_hasHydrated, userId, router]);

  // Load conversation history
  useEffect(() => {
    if (!userId || !conversationId) {
      if (_hasHydrated && userId) {
        setError(true);
        setLoading(false);
      }
      return;
    }

    // Don't reload if already loaded in store
    const store = useChatStore.getState();
    if (store.conversationId === conversationId && store.messages.length > 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const detail = await getConversationDetail(userId!, conversationId!);
        if (cancelled) return;

        if (!detail) {
          // Conversation not found — start fresh
          useChatStore.getState().clearMessages();
          router.replace("/chat");
          return;
        }

        const chatMessages: ChatMessage[] = detail.chat_history.flatMap(
          (entry) => [
            {
              id: `user-${entry.id}`,
              role: "user" as const,
              content: entry.user_input,
              timestamp: new Date(entry.created_at ?? Date.now()).getTime(),
            },
            {
              id: `assistant-${entry.id}`,
              role: "assistant" as const,
              content: entry.bot_response,
              source: entry.model_used ? `Source: ${entry.model_used}` : null,
              timestamp: new Date(entry.created_at ?? Date.now()).getTime(),
            },
          ]
        );

        loadMessages(chatMessages, conversationId!);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId, conversationId, _hasHydrated, loadMessages, router]);

  // Wait for hydration
  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  // Not completed onboarding — redirecting
  if (!userId) {
    return null;
  }

  // Loading conversation
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  // Error loading conversation
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Could not load conversation.
          </p>
          <button
            onClick={() => router.replace("/chat")}
            className="text-sm text-primary hover:underline"
          >
            Start a new conversation
          </button>
        </div>
      </div>
    );
  }

  return <FitMateChat />;
}
