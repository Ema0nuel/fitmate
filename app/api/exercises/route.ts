/**
 * POST /api/exercises — Create an exercise in the catalog
 * GET  /api/exercises — List or search exercises
 */

import { ensureDb, errorResponse, createdResponse, parseBody, getSearchParam } from "../utils";
import { createExercise, listExercises, searchExercises } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  ensureDb();
  try {
    const body = await parseBody<{
      name: string;
      description?: string | null;
      muscle_group?: string | null;
      equipment?: string | null;
      difficulty?: string | null;
    }>(req);

    if (!body.name) {
      return errorResponse("name is required", 400);
    }

    const exercise = createExercise(body);
    return createdResponse(exercise);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to create exercise", 500);
  }
}

export async function GET(req: Request) {
  ensureDb();
  const q = getSearchParam(req.url, "q");
  const muscleGroup = getSearchParam(req.url, "muscle_group");

  let exercises;
  if (q) {
    exercises = searchExercises(q);
  } else {
    exercises = listExercises(muscleGroup ?? undefined);
  }
  return NextResponse.json(exercises);
}
