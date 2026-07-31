/**
 * GET /api/goals/[userId] — List goals for a user
 */

import { ensureDb, notFound, getSearchParam } from "../../utils";
import { getFitnessGoals } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  ensureDb();
  const { userId } = await params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) return notFound("Invalid user ID");

  const status = getSearchParam(req.url, "status");
  const goals = getFitnessGoals(id, status ?? undefined);
  return NextResponse.json(goals);
}
