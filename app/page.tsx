"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboarding-store";

/**
 * / — Root page (pure redirector)
 *
 * No UI rendered. Checks onboarding state and redirects:
 *   - Has userId → /chat (returning user, empty-state landing)
 *   - No userId → /onboarding (first-time user)
 *   - Not hydrated → spinner (prevents flash of wrong content)
 */
export default function Home() {
  const router = useRouter();
  const { userId, _hasHydrated } = useOnboardingStore();

  useEffect(() => {
    if (_hasHydrated) {
      router.replace(userId ? "/chat" : "/onboarding");
    }
  }, [_hasHydrated, userId, router]);

  // Hydration spinner — minimal, prevents redirect flash
  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  // Redirecting — render nothing
  return null;
}
