"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useChatStore } from "@/store/chat-store";
import { listConversations } from "@/lib/api";
import { getOrCreateUuid } from "@/lib/conversation-mapping";
import { cn } from "@/lib/utils";
import {
  User,
  MessageSquarePlus,
  MessageSquare,
  Clock,
  Settings,
  RotateCcw,
} from "lucide-react";

/**
 * ProfileDropdown — Radix DropdownMenu triggered by user initials button.
 *
 * Shows user info (name, quick stats, goals) and actions:
 * - New Chat: clears messages, starts fresh
 * - Reset Onboarding: debug/dev action to restart onboarding
 */
export default function ProfileDropdown() {
  const router = useRouter();
  const { profile, userId, resetOnboarding } = useOnboardingStore();
  const { clearMessages } = useChatStore();
  const [conversations, setConversations] = useState<
    { id: number; title: string | null; created_at: string | null }[]
  >([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const initial = profile.name ? profile.name.charAt(0).toUpperCase() : "?";

  // Load conversation history when dropdown opens
  const handleOpenChange = (open: boolean) => {
    if (open && !historyLoaded && userId) {
      listConversations(userId)
        .then((convos) => {
          setConversations(convos);
          setHistoryLoaded(true);
        })
        .catch(() => {});
    }
  };

  const handleNewChat = () => {
    clearMessages();
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
    <DropdownMenu.Root onOpenChange={handleOpenChange}>
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
            "z-50 w-64 p-1.5",
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

          {/* Profile */}
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg cursor-pointer",
              "text-foreground outline-none",
              "hover:bg-muted transition-colors"
            )}
          >
            <User className="h-4 w-4 text-muted-foreground" />
            <span>My Profile</span>
          </DropdownMenu.Item>

          {/* History */}
          <DropdownMenu.Label className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Recent Conversations</span>
          </DropdownMenu.Label>

          {conversations.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground/60">
              {historyLoaded ? "No conversations yet" : "Loading..."}
            </div>
          )}

          {conversations.slice(0, 5).map((conv) => (
            <DropdownMenu.Item
              key={conv.id}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg cursor-pointer",
                "text-foreground outline-none",
                "hover:bg-muted transition-colors"
              )}
              onSelect={() => {
                const uuid = getOrCreateUuid(conv.id);
                router.push(`/chat/${uuid}`);
              }}
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">
                {conv.title || "New Conversation"}
              </span>
            </DropdownMenu.Item>
          ))}

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

          {/* Settings */}
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg cursor-pointer",
              "text-foreground outline-none",
              "hover:bg-muted transition-colors"
            )}
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Settings</span>
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
