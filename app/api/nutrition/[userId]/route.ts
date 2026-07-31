/**
 * GET /api/nutrition/[userId] — List nutrition entries for a user
 */

import { ensureDb, notFound, getSearchParam } from "../../utils";
import { listNutritionEntries } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  ensureDb();
  const { userId } = await params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) return notFound("Invalid user ID");

  const date = getSearchParam(req.url, "date");
  const entries = listNutritionEntries(id, date ?? undefined);
  return NextResponse.json(entries);
}
