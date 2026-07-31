/**
 * GET  /api/profiles/[userId] — Get profile by user ID
 * PUT  /api/profiles/[userId] — Update profile
 */

import { ensureDb, notFound, parseBody } from "../../utils";
import { getProfile, updateProfile } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  ensureDb();
  const { userId } = await params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) return notFound("Invalid user ID");

  const profile = getProfile(id);
  if (!profile) return notFound("Profile not found");
  return NextResponse.json(profile);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  ensureDb();
  const { userId } = await params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) return notFound("Invalid user ID");

  const existing = getProfile(id);
  if (!existing) return notFound("Profile not found");

  try {
    const body = await parseBody(req);
    const updated = updateProfile(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update profile" },
      { status: 500 },
    );
  }
}
