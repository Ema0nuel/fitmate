/**
 * GET /api/progress/[userId] — List progress entries for a user
 */

import { ensureDb, notFound, getSearchParam } from "../../utils";
import { listProgressEntries } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  ensureDb();
  const { userId } = await params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) return notFound("Invalid user ID");

  const limitStr = getSearchParam(req.url, "limit");
  const limit = limitStr ? parseInt(limitStr, 10) : 30;

  const entries = listProgressEntries(id, isNaN(limit) ? 30 : limit);
  return NextResponse.json(entries);
}
