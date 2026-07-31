"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboarding-store";
import { MessageSquare } from "lucide-react";

/**
 * /chat — Main chat interface (placeholder)
 *
 * Route guard: redirects to /onboarding if not completed.
 * This is where the core product lives — AI fitness Q&A with
 * source citations, conversation history, and guardrail enforcement.
 */
export default function ChatPage() {
  const router = useRouter();
  const { isOnboardingComplete, profile, _hasHydrated } = useOnboardingStore();

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (_hasHydrated && !isOnboardingComplete) {
      router.replace("/onboarding");
    }
  }, [_hasHydrated, isOnboardingComplete, router]);

  // Wait for hydration
  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  // Not completed onboarding — redirecting
  if (!isOnboardingComplete) {
    return null;
  }

  // ─── Chat placeholder ──────────────────────────────────
  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-xl">💪</span>
        <h1 className="text-lg font-bold tracking-tight text-foreground">FitMate</h1>
        <span className="ml-auto text-sm text-muted-foreground">
          Hey, {profile.name || "there"}!
        </span>
      </header>

      {/* Chat area (placeholder) */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          Chat coming soon
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          This is where you&apos;ll ask FitMate about exercises, nutrition, and
          healthy living. The AI is trained on WHO, ACE, and HHS guidelines.
        </p>

        {/* Quick suggestions */}
        <div className="mt-8 flex flex-col gap-2">
          {[
            "How do I do a bodyweight squat?",
            "What should I eat before a workout?",
            "How much cardio should I do per week?",
          ].map((q) => (
            <div
              key={q}
              className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
            >
              {q}
            </div>
          ))}
        </div>
      </div>

      {/* Input bar (placeholder) */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-3">
          <input
            type="text"
            placeholder="Ask FitMate anything about fitness..."
            disabled
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            disabled
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
