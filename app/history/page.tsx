"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboarding-store";
import ChatHeader from "@/components/chat/chat-header";
import HistoryList from "@/components/history/history-list";

/**
 * /history — Conversation history page
 *
 * Shows all past conversations with titles, dates, and preview text.
 * Each conversation links to /chat/[uuid].
 *
 * Route guard: if onboarding is not complete, redirect to /onboarding.
 */
export default function HistoryPage() {
  const router = useRouter();
  const { userId, _hasHydrated } = useOnboardingStore();

  // Redirect to onboarding if user never completed it
  useEffect(() => {
    if (_hasHydrated && !userId) {
      router.replace("/onboarding");
    }
  }, [_hasHydrated, userId, router]);

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

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <ChatHeader />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <h1 className="text-lg font-semibold text-foreground mb-5">
            History
          </h1>
          <HistoryList userId={userId} />
        </div>
      </main>
    </div>
  );
}
