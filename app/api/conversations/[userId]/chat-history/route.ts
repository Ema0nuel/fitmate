/**
 * GET /api/conversations/[userId]/chat-history — Get chat history
 */

import { ensureDb, notFound, getSearchParam } from "../../../utils";
import { listChatHistory } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  ensureDb();
  const { userId } = await params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) return notFound("Invalid user ID");

  const conversationIdStr = getSearchParam(req.url, "conversation_id");
  const limitStr = getSearchParam(req.url, "limit");

  const conversationId = conversationIdStr ? parseInt(conversationIdStr, 10) : null;
  const limit = limitStr ? parseInt(limitStr, 10) : 50;

  const entries = listChatHistory(
    id,
    conversationId && !isNaN(conversationId) ? conversationId : null,
    isNaN(limit) ? 50 : limit,
  );
  return NextResponse.json(entries);
}
