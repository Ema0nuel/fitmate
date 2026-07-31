/**
 * GET /api/memory/[userId] — List conversation memories for a user
 */

import { ensureDb, notFound } from "../../utils";
import { listConversationMemories } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  ensureDb();
  const { userId } = await params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) return notFound("Invalid user ID");

  const memories = listConversationMemories(id);
  return NextResponse.json(memories);
}
