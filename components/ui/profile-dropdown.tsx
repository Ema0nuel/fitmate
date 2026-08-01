"use client";

import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/utils";
import {
  User,
  MessageSquarePlus,
  Clock,
  RotateCcw,
} from "lucide-react";

/**
 * ProfileDropdown — Radix DropdownMenu triggered by user initials button.
 *
 * Clean action menu with 4 items:
 *   1. My Profile — navigates to /profile
 *   2. New Chat — clears messages, navigates to /chat
 *   3. History — navigates to /history
 *   4. Reset Onboarding — clears store, redirects to /onboarding
 */
export default function ProfileDropdown() {
  const router = useRouter();
  const { profile, resetOnboarding } = useOnboardingStore();
  const { clearMessages } = useChatStore();

  const initial = profile.name ? profile.name.charAt(0).toUpperCase() : "?";

  const handleNewChat = () => {
    clearMessages();
    router.push("/chat");
  };

  const handleResetOnboarding = () => {
    resetOnboarding();
    router.push("/onboarding");
  };

  const formatLevel = (level: string | null) => {
    if (!level) return null;
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  const statParts: string[] = [];
  if (profile.fitness_level) statParts.push(formatLevel(profile.fitness_level)!);
  if (profile.weight_kg) statParts.push(`${profile.weight_kg}kg`);
  if (profile.height_cm) statParts.push(`${profile.height_cm}cm`);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            "bg-primary/10 text-primary font-medium text-sm",
            "transition-colors hover:bg-primary/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          )}
          aria-label="Profile menu"
        >
          {initial}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 w-56 p-1.5",
            "bg-background border border-border rounded-xl",
            "shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
            "animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2",
            "data-[side=top]:slide-in-from-bottom-2"
          )}
        >
          {/* User info header */}
          <div className="px-3 py-2.5 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-xs">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile.name || "User"}
                </p>
                {statParts.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">
                    {statParts.join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu.Separator className="h-px bg-border mx-1 my-1" />

          {/* My Profile */}
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg cursor-pointer",
              "text-foreground outline-none",
              "hover:bg-muted transition-colors"
            )}
            onSelect={() => router.push("/profile")}
          >
            <User className="h-4 w-4 text-muted-foreground" />
            <span>My Profile</span>
          </DropdownMenu.Item>

          {/* New Chat */}
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg cursor-pointer",
              "text-foreground outline-none",
              "hover:bg-muted transition-colors"
            )}
            onSelect={handleNewChat}
          >
            <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
            <span>New Chat</span>
          </DropdownMenu.Item>

          {/* History */}
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg cursor-pointer",
              "text-foreground outline-none",
              "hover:bg-muted transition-colors"
            )}
            onSelect={() => router.push("/history")}
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>History</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-border mx-1 my-1" />

          {/* Reset Onboarding */}
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg cursor-pointer",
              "text-foreground outline-none",
              "hover:bg-destructive/10 hover:text-destructive transition-colors"
            )}
            onSelect={handleResetOnboarding}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Onboarding</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
