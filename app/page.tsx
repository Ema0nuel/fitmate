"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboarding-store";
import { Button } from "@/components/ui/button";

/**
 * / — Root page (Landing)
 *
 * Routing guard:
 * - First-time visitors (isOnboardingComplete = false) → redirect to /onboarding
 * - Returning visitors (isOnboardingComplete = true) → show landing page
 *
 * The Zustand store is persisted to localStorage, so "first-time" means
 * the user has never completed onboarding in this browser.
 */
export default function Home() {
  const router = useRouter();
  const { isOnboardingComplete, _hasHydrated } = useOnboardingStore();

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (_hasHydrated && !isOnboardingComplete) {
      router.replace("/onboarding");
    }
  }, [_hasHydrated, isOnboardingComplete, router]);

  // Don't render until Zustand has hydrated — prevents redirect flash
  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  // First-time visitor — show nothing while redirecting to /onboarding
  if (!isOnboardingComplete) {
    return null;
  }

  // ─── Returning visitor landing page ───────────────────────
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background font-sans">
      <main className="flex w-full max-w-3xl flex-col items-center justify-center gap-8 px-6 py-20">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <span className="text-4xl">💪</span>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              FitMate
            </h1>
          </div>
          <p className="max-w-md text-lg text-muted-foreground">
            Your AI fitness assistant — trained on WHO, ACE, and HHS guidelines.
            Ask about exercises, nutrition, or healthy living.
          </p>
        </div>

        <div className="w-full max-w-lg rounded-2xl border border-border bg-muted p-6">
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              How do I perform a bodyweight squat?
            </div>
            <div className="ml-8 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
              A bodyweight squat targets your quadriceps, hamstrings, and
              glutes. Stand with feet shoulder-width apart, push your hips back,
              and lower until your thighs are parallel to the ground...
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Chat coming soon
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <span className="rounded-full border border-border bg-muted px-3 py-1">
            🏋️ Exercise Guidance
          </span>
          <span className="rounded-full border border-border bg-muted px-3 py-1">
            🥗 Nutrition Advice
          </span>
          <span className="rounded-full border border-border bg-muted px-3 py-1">
            🩺 Evidence-Based
          </span>
        </div>

        <Button
          size="lg"
          onClick={() => router.push("/chat")}
          className="mt-4 w-full max-w-xs"
        >
          Open Chat
        </Button>
      </main>
    </div>
  );
}
