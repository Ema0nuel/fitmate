"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboarding-store";
import FitMateChat from "@/components/chat/fitmate-chat";

/**
 * /chat — New conversation page
 *
 * Same as / — shows the chat interface for a fresh conversation.
 * After the first message, fitmate-chat.tsx redirects to /chat/[conversationId].
 */
export default function ChatPage() {
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

  return <FitMateChat />;
}
