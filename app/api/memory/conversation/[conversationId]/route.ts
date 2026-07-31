/**
 * GET /api/memory/conversation/[conversationId] — Get memory for a conversation
 */

import { ensureDb, notFound } from "../../../utils";
import { getConversationMemory } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  ensureDb();
  const { conversationId } = await params;
  const id = parseInt(conversationId, 10);
  if (isNaN(id)) return notFound("Invalid conversation ID");

  const memory = getConversationMemory(id);
  if (!memory) return notFound("No memory found for this conversation");
  return NextResponse.json(memory);
}
