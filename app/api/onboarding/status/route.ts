/**
 * GET /api/onboarding/status?user_id=1 — Check onboarding completion
 */

import { ensureDb, getSearchParam } from "../../utils";
import { getProfile } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  ensureDb();
  const userIdStr = getSearchParam(req.url, "user_id");

  if (userIdStr) {
    const userId = parseInt(userIdStr, 10);
    if (!isNaN(userId)) {
      const profile = getProfile(userId);
      if (profile) {
        return NextResponse.json({
          has_profile: true,
          onboarding_complete: profile.onboarding_complete,
          user_id: userId,
        });
      }
    }
  }

  return NextResponse.json({
    has_profile: false,
    onboarding_complete: false,
  });
}
