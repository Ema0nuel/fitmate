/**
 * GET /api/conversations/[userId]
 *   — No query: list all conversations for the user
 *   — ?conversationId=N: fetch a single conversation with chat history
 * DELETE /api/conversations/[userId]
 *   — ?conversationId=N: delete a conversation and its related data
 */

import { ensureDb, notFound } from "../../utils";
import { listConversations, getConversation, listChatHistory, deleteConversation } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  ensureDb();
  const { userId } = await params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) return notFound("Invalid user ID");

  const url = new URL(req.url);
  const convIdParam = url.searchParams.get("conversationId");

  // Single conversation fetch
  if (convIdParam) {
    const convId = parseInt(convIdParam, 10);
    if (isNaN(convId)) return notFound("Invalid conversation ID");

    const conv = getConversation(convId);
    if (!conv) return notFound("Conversation not found");

    const chat_history = listChatHistory(conv.user_id, convId, 200);
    return NextResponse.json({ ...conv, chat_history });
  }

  // List all conversations
  const convs = listConversations(id);
  return NextResponse.json(convs);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  ensureDb();
  const { userId } = await params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) return notFound("Invalid user ID");

  const url = new URL(req.url);
  const convIdParam = url.searchParams.get("conversationId");
  if (!convIdParam) return notFound("conversationId query parameter required");

  const convId = parseInt(convIdParam, 10);
  if (isNaN(convId)) return notFound("Invalid conversation ID");

  const conv = getConversation(convId);
  if (!conv || conv.user_id !== id) return notFound("Conversation not found");

  const deleted = deleteConversation(convId);
  return NextResponse.json({ deleted });
}
