/**
 * POST /api/workout-plans/[planId]/exercises — Add exercise to a plan
 * GET  /api/workout-plans/[planId]/exercises — List exercises in a plan
 */

import { ensureDb, notFound, errorResponse, createdResponse, parseBody } from "../../../utils";
import { getWorkoutPlan, createWorkoutExercise, listWorkoutExercises } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  ensureDb();
  const { planId } = await params;
  const planIdNum = parseInt(planId, 10);
  if (isNaN(planIdNum)) return notFound("Invalid plan ID");

  const plan = getWorkoutPlan(planIdNum);
  if (!plan) return notFound("Workout plan not found");

  try {
    const body = await parseBody<{
      exercise_name: string;
      sets?: number | null;
      reps?: number | null;
      duration_seconds?: number | null;
      rest_seconds?: number | null;
      notes?: string | null;
      order_index?: number;
    }>(req);

    if (!body.exercise_name) {
      return errorResponse("exercise_name is required", 400);
    }

    const exercise = createWorkoutExercise({
      workout_plan_id: planIdNum,
      exercise_name: body.exercise_name,
      sets: body.sets,
      reps: body.reps,
      duration_seconds: body.duration_seconds,
      rest_seconds: body.rest_seconds,
      notes: body.notes,
      order_index: body.order_index,
    });
    return createdResponse(exercise);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to add exercise", 500);
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  ensureDb();
  const { planId } = await params;
  const planIdNum = parseInt(planId, 10);
  if (isNaN(planIdNum)) return notFound("Invalid plan ID");

  const exercises = listWorkoutExercises(planIdNum);
  return NextResponse.json(exercises);
}
