/**
 * FitMate — Chat Store (Zustand)
 *
 * Manages the active chat session state.
 * Persisted to localStorage so messages survive page reloads
 * within the same browser session.
 *
 * Architecture:
 * - Messages are stored locally for instant UI responsiveness
 * - Backend persistence happens via /api/chat (lib/api.ts sendMessage)
 * - conversation_id links local state to backend chat_history table
 * - Clearing the store starts a fresh conversation
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ═══════════════════════════════════════════════════
// Types — aligned with backend chat_history table
// ═══════════════════════════════════════════════════

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string | null;
  timestamp: number;
}

interface ChatState {
  /** Active messages in the current conversation */
  messages: ChatMessage[];

  /** Backend conversation ID (set after first message exchange) */
  conversationId: number | null;

  /** Whether the AI is currently processing a response */
  isLoading: boolean;

  /** Whether the store has been hydrated from localStorage */
  _hasHydrated: boolean;

  // Actions
  addUserMessage: (content: string) => void;
  addAssistantMessage: (
    content: string,
    source?: string | null
  ) => void;
  addErrorMessage: () => void;
  setLoading: (loading: boolean) => void;
  setConversationId: (id: number) => void;
  clearMessages: () => void;
  setHasHydrated: (value: boolean) => void;
  removeLastAssistantMessage: () => void;
  updateMessageContent: (id: string, content: string) => void;
  loadMessages: (messages: ChatMessage[], conversationId: number) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      conversationId: null,
      isLoading: false,
      _hasHydrated: false,

      addUserMessage: (content: string) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: `user-${Date.now()}`,
              role: "user" as const,
              content,
              timestamp: Date.now(),
            },
          ],
        })),

      addAssistantMessage: (content: string, source?: string | null) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant" as const,
              content,
              source: source ?? null,
              timestamp: Date.now(),
            },
          ],
        })),

      addErrorMessage: () =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: `error-${Date.now()}`,
              role: "assistant" as const,
              content:
                "Sorry, something went wrong. Please try again.",
              timestamp: Date.now(),
            },
          ],
        })),

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      setConversationId: (id: number) => set({ conversationId: id }),

      clearMessages: () =>
        set({ messages: [], conversationId: null }),

      setHasHydrated: (value: boolean) => set({ _hasHydrated: value }),

      removeLastAssistantMessage: () =>
        set((state) => {
          const lastIdx = state.messages.findLastIndex(
            (m) => m.role === "assistant"
          );
          if (lastIdx === -1) return state;
          return {
            messages: state.messages.filter((_, i) => i !== lastIdx),
          };
        }),

      updateMessageContent: (id: string, content: string) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, content } : m
          ),
        })),

      loadMessages: (messages: ChatMessage[], conversationId: number) =>
        set({ messages, conversationId }),
    }),
    {
      name: "fitmate-chat",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messages: state.messages,
        conversationId: state.conversationId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
