"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboarding-store";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

/**
 * /onboarding — Multi-step profile setup
 *
 * Route guard: if onboarding is already complete, redirect to /chat.
 * If the store hasn't hydrated from localStorage yet, show nothing
 * (prevents flash of wrong content).
 *
 * Layout: mobile-first.
 * - Mobile (< sm): fills full viewport height, no border/shadow.
 *   The onboarding IS the app on mobile — no chrome, no frame.
 * - Desktop (≥ sm): centered phone-frame card with rounded corners
 *   and subtle shadow. Creates the "companion app" feel.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { isOnboardingComplete, _hasHydrated } = useOnboardingStore();

  // Redirect to /chat if onboarding is already done
  useEffect(() => {
    if (_hasHydrated && isOnboardingComplete) {
      router.replace("/chat");
    }
  }, [_hasHydrated, isOnboardingComplete, router]);

  // Don't render until Zustand has hydrated from localStorage
  if (!_hasHydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
          <span className="font-mono text-xs text-muted-foreground/50">
            loading
          </span>
        </div>
      </div>
    );
  }

  // Already completed — show nothing while redirecting
  if (isOnboardingComplete) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col sm:my-8 sm:h-[calc(100dvh-4rem)] sm:min-h-0 sm:overflow-hidden sm:rounded-3xl sm:border sm:border-border sm:shadow-lg">
      <OnboardingFlow />
    </div>
  );
}
