"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useChatStore } from "@/store/chat-store";
import FitMateChat from "@/components/chat/fitmate-chat";

/**
 * /chat — Empty-state landing page
 *
 * The canonical "logged-in home." Always starts fresh — clears any
 * stale messages from localStorage on mount.
 */
export default function ChatPage() {
  const router = useRouter();
  const { userId, _hasHydrated } = useOnboardingStore();
  const clearMessages = useChatStore((s) => s.clearMessages);

  // Redirect to onboarding if user never completed it
  useEffect(() => {
    if (_hasHydrated && !userId) {
      router.replace("/onboarding");
    }
  }, [_hasHydrated, userId, router]);

  // Always start fresh — /chat is the new-conversation page
  useEffect(() => {
    if (_hasHydrated && userId) {
      clearMessages();
    }
  }, [_hasHydrated, userId, clearMessages]);

  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!userId) return null;

  return <FitMateChat />;
}
