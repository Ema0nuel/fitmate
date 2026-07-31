/**
 * POST /api/profiles — Create a profile (called when onboarding completes)
 */

import { ensureDb, errorResponse, createdResponse, parseBody } from "../utils";
import { getUser, getProfile, createProfile } from "@/lib/db";

export async function POST(req: Request) {
  ensureDb();
  try {
    const body = await parseBody<{
      user_id: number;
      age?: number | null;
      gender?: string | null;
      weight_kg?: number | null;
      height_cm?: number | null;
      fitness_level?: string | null;
      medical_flags?: string | null;
      onboarding_complete?: boolean;
    }>(req);

    if (!body.user_id) {
      return errorResponse("user_id is required", 400);
    }

    // Verify user exists
    const user = getUser(body.user_id);
    if (!user) return errorResponse("User not found", 404);

    // Check if profile already exists
    const existing = getProfile(body.user_id);
    if (existing) {
      return errorResponse("Profile already exists. Use PUT to update.", 409);
    }

    const profile = createProfile(body);
    return createdResponse(profile);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to create profile", 500);
  }
}
