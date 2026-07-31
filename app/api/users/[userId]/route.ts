/**
 * GET /api/users/[userId] — Get user by ID
 */

import { ensureDb, notFound } from "../../utils";
import { getUser } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  ensureDb();
  const { userId } = await params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) return notFound("Invalid user ID");

  const user = getUser(id);
  if (!user) return notFound("User not found");
  return NextResponse.json(user);
}
