"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { listConversations, deleteConversation } from "@/lib/api";
import { getOrCreateUuid } from "@/lib/conversation-mapping";
import { cn } from "@/lib/utils";
import { MessageSquare, Plus, Trash2 } from "lucide-react";

/**
 * HistoryList — Scrollable list of past conversations.
 *
 * Each card shows title, relative date, first message preview,
 * and a delete button (visible on hover / always on touch).
 */

interface Conversation {
  id: number;
  title: string | null;
  created_at: string | null;
  first_message?: string | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function HistoryList({ userId }: { userId: number }) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    listConversations(userId)
      .then((data) => {
        if (!cancelled) {
          setConversations(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleDelete = useCallback(
    async (conv: Conversation) => {
      const confirmed = window.confirm(
        `Delete "${conv.title || "New Conversation"}"? This can't be undone.`
      );
      if (!confirmed) return;

      setDeletingId(conv.id);
      try {
        await deleteConversation(userId, conv.id);
        setConversations((prev) => prev.filter((c) => c.id !== conv.id));
      } catch {
        // Silently fail — list stays unchanged
      } finally {
        setDeletingId(null);
      }
    },
    [userId]
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <MessageSquare className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-foreground">
          No conversations yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Start chatting to see your history here
        </p>
        <button
          onClick={() => router.push("/chat")}
          className={cn(
            "mt-5 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium",
            "bg-primary text-white",
            "transition-colors hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          )}
        >
          <Plus className="h-4 w-4" />
          Start a conversation
        </button>
      </div>
    );
  }

  // Conversation list
  return (
    <div className="flex flex-col gap-2">
      {conversations.map((conv) => {
        const uuid = getOrCreateUuid(conv.id);
        return (
          <div
            key={conv.id}
            className={cn(
              "group relative flex flex-col gap-1 rounded-xl border border-border px-4 py-3",
              "transition-colors hover:bg-muted",
              deletingId === conv.id && "opacity-40 pointer-events-none"
            )}
          >
            {/* Main row — clickable to open conversation */}
            <button
              onClick={() => router.push(`/chat/${uuid}`)}
              className="flex items-center justify-between gap-3 text-left"
            >
              <p className="text-sm font-medium text-foreground truncate">
                {conv.title || "New Conversation"}
              </p>
              {conv.created_at && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(conv.created_at)}
                </span>
              )}
            </button>

            {/* Preview + delete row */}
            <div className="flex items-center justify-between gap-2">
              {conv.first_message ? (
                <p className="text-xs text-muted-foreground truncate min-w-0">
                  {conv.first_message}
                </p>
              ) : (
                <span />
              )}

              {/* Delete button — visible on hover, always on touch */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(conv);
                }}
                className={cn(
                  "shrink-0 rounded-lg p-1.5",
                  "text-muted-foreground/50",
                  "transition-colors hover:bg-destructive/10 hover:text-destructive",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40",
                  "opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
                  // Always visible on touch devices
                  "max-sm:opacity-100"
                )}
                aria-label={`Delete ${conv.title || "conversation"}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
