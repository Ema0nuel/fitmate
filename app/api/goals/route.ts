/**
 * POST /api/goals — Create a fitness goal
 */

import { ensureDb, errorResponse, createdResponse, parseBody } from "../utils";
import { getUser, createFitnessGoal } from "@/lib/db";

export async function POST(req: Request) {
  ensureDb();
  try {
    const body = await parseBody<{
      user_id: number;
      goal_type: string;
      target_value?: number | null;
      target_unit?: string | null;
      target_date?: string | null;
      description?: string | null;
      status?: string;
    }>(req);

    if (!body.user_id || !body.goal_type) {
      return errorResponse("user_id and goal_type are required", 400);
    }

    const user = getUser(body.user_id);
    if (!user) return errorResponse("User not found", 404);

    const goal = createFitnessGoal(body);
    return createdResponse(goal);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to create goal", 500);
  }
}
