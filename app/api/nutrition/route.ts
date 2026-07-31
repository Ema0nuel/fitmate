/**
 * POST /api/nutrition — Create a nutrition entry
 */

import { ensureDb, errorResponse, createdResponse, parseBody } from "../utils";
import { getUser, createNutritionEntry } from "@/lib/db";

export async function POST(req: Request) {
  ensureDb();
  try {
    const body = await parseBody<{
      user_id: number;
      date: string;
      meal_type: string;
      description: string;
      calories?: number | null;
      protein_g?: number | null;
      carbs_g?: number | null;
      fat_g?: number | null;
      notes?: string | null;
    }>(req);

    if (!body.user_id || !body.date || !body.meal_type || !body.description) {
      return errorResponse("user_id, date, meal_type, and description are required", 400);
    }

    const user = getUser(body.user_id);
    if (!user) return errorResponse("User not found", 404);

    const entry = createNutritionEntry(body);
    return createdResponse(entry);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to create nutrition entry", 500);
  }
}
