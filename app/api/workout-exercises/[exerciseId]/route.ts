/**
 * DELETE /api/workout-exercises/[exerciseId] — Remove exercise from a plan
 */

import { ensureDb, notFound } from "../../utils";
import { deleteWorkoutExercise } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ exerciseId: string }> },
) {
  ensureDb();
  const { exerciseId } = await params;
  const id = parseInt(exerciseId, 10);
  if (isNaN(id)) return notFound("Invalid exercise ID");

  const deleted = deleteWorkoutExercise(id);
  if (!deleted) return notFound("Exercise not found");
  return NextResponse.json({ detail: "Exercise removed from plan" });
}
