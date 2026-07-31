/**
 * POST /api/progress — Create a progress entry
 */

import { ensureDb, errorResponse, createdResponse, parseBody } from "../utils";
import { getUser, createProgressEntry } from "@/lib/db";

export async function POST(req: Request) {
  ensureDb();
  try {
    const body = await parseBody<{
      user_id: number;
      date: string;
      weight_kg?: number | null;
      body_fat_pct?: number | null;
      bench_press_max_kg?: number | null;
      squat_max_kg?: number | null;
      deadlift_max_kg?: number | null;
      run_time_seconds?: number | null;
      push_ups?: number | null;
      notes?: string | null;
    }>(req);

    if (!body.user_id || !body.date) {
      return errorResponse("user_id and date are required", 400);
    }

    const user = getUser(body.user_id);
    if (!user) return errorResponse("User not found", 404);

    const entry = createProgressEntry(body);
    return createdResponse(entry);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to create progress entry", 500);
  }
}
