"use client";

import { Sparkles } from "lucide-react";

/**
 * ChatWelcome — Empty state shown when no messages exist.
 *
 * Vertically centered cluster: icon + greeting + subtitle.
 * Parent (FitMateChat) handles the entrance animation.
 */
export default function ChatWelcome({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Icon */}
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-foreground">
        Welcome back, {name || "there"}
      </h2>

      {/* Subtitle */}
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Ask me anything about exercise, nutrition, or healthy living.
        I&apos;m trained on WHO, ACE, and HHS guidelines.
      </p>
    </div>
  );
}
