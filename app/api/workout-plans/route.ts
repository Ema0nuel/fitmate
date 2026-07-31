/**
 * POST /api/workout-plans          — Create a workout plan
 * GET  /api/workout-plans?user_id= — List workout plans for a user
 */

import { ensureDb, errorResponse, createdResponse, parseBody, getSearchParam } from "../utils";
import { getUser, createWorkoutPlan, listWorkoutPlans } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  ensureDb();
  try {
    const body = await parseBody<{
      user_id: number;
      name: string;
      description?: string | null;
      days_per_week?: number | null;
      duration_weeks?: number | null;
      status?: string;
    }>(req);

    if (!body.user_id || !body.name) {
      return errorResponse("user_id and name are required", 400);
    }

    const user = getUser(body.user_id);
    if (!user) return errorResponse("User not found", 404);

    const plan = createWorkoutPlan(body);
    return createdResponse(plan);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to create workout plan", 500);
  }
}

export async function GET(req: Request) {
  ensureDb();
  const userIdStr = getSearchParam(req.url, "user_id");
  if (!userIdStr) return errorResponse("user_id query parameter is required", 400);

  const userId = parseInt(userIdStr, 10);
  if (isNaN(userId)) return errorResponse("Invalid user_id", 400);

  const user = getUser(userId);
  if (!user) return errorResponse("User not found", 404);

  const status = getSearchParam(req.url, "status");
  const plans = listWorkoutPlans(userId, status ?? undefined);
  return NextResponse.json(plans);
}
