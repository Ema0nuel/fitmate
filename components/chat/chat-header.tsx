"use client";

import { Sparkles } from "lucide-react";
import ProfileDropdown from "@/components/ui/profile-dropdown";

/**
 * ChatHeader — Top navigation bar with branding and profile access.
 *
 * Left: FitMate logo (Sparkles icon + text)
 * Right: Profile button (user initials) triggering ProfileDropdown
 */
export default function ChatHeader() {
  return (
    <header className="shrink-0 bg-background/80 backdrop-blur-lg sticky top-0 z-40">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        {/* Left — branding */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            FitMate
          </span>
        </div>

        {/* Right — profile */}
        <ProfileDropdown />
      </div>
    </header>
  );
}
