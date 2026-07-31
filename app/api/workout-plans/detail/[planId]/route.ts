/**
 * GET    /api/workout-plans/detail/[planId] — Get a workout plan
 * PUT    /api/workout-plans/detail/[planId] — Update a workout plan
 * DELETE /api/workout-plans/detail/[planId] — Delete a workout plan
 */

import { ensureDb, notFound, parseBody } from "../../../utils";
import { getWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  ensureDb();
  const { planId } = await params;
  const id = parseInt(planId, 10);
  if (isNaN(id)) return notFound("Invalid plan ID");

  const plan = getWorkoutPlan(id);
  if (!plan) return notFound("Workout plan not found");
  return NextResponse.json(plan);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  ensureDb();
  const { planId } = await params;
  const id = parseInt(planId, 10);
  if (isNaN(id)) return notFound("Invalid plan ID");

  const existing = getWorkoutPlan(id);
  if (!existing) return notFound("Workout plan not found");

  try {
    const body = await parseBody(req);
    const updated = updateWorkoutPlan(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update plan" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  ensureDb();
  const { planId } = await params;
  const id = parseInt(planId, 10);
  if (isNaN(id)) return notFound("Invalid plan ID");

  const deleted = deleteWorkoutPlan(id);
  if (!deleted) return notFound("Workout plan not found");
  return NextResponse.json({ detail: "Workout plan deleted" });
}
