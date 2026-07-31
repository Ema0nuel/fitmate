/**
 * PUT   /api/goals/detail/[goalId] — Update a goal
 * DELETE /api/goals/detail/[goalId] — Delete a goal
 */

import { ensureDb, notFound, parseBody } from "../../../utils";
import { getFitnessGoal, updateFitnessGoal, deleteFitnessGoal } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ goalId: string }> },
) {
  ensureDb();
  const { goalId } = await params;
  const id = parseInt(goalId, 10);
  if (isNaN(id)) return notFound("Invalid goal ID");

  const existing = getFitnessGoal(id);
  if (!existing) return notFound("Goal not found");

  try {
    const body = await parseBody(req);
    const updated = updateFitnessGoal(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update goal" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ goalId: string }> },
) {
  ensureDb();
  const { goalId } = await params;
  const id = parseInt(goalId, 10);
  if (isNaN(id)) return notFound("Invalid goal ID");

  const deleted = deleteFitnessGoal(id);
  if (!deleted) return notFound("Goal not found");
  return NextResponse.json({ detail: "Goal deleted" });
}
