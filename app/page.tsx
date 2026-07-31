"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboarding-store";
import FitMateChat from "@/components/chat/fitmate-chat";

/**
 * / — Root page
 *
 * Chat-first experience:
 * - If userId exists (onboarding completed) → show chat directly
 * - If userId is null (never onboarded) → redirect to /onboarding
 */
export default function Home() {
  const router = useRouter();
  const { userId, _hasHydrated } = useOnboardingStore();

  // Redirect to onboarding if user never completed it
  useEffect(() => {
    if (_hasHydrated && !userId) {
      router.replace("/onboarding");
    }
  }, [_hasHydrated, userId, router]);

  // Don't render until Zustand has hydrated — prevents redirect flash
  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  // Never onboarded — redirecting
  if (!userId) {
    return null;
  }

  // Show chat directly
  return <FitMateChat />;
}
