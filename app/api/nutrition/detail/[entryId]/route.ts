/**
 * PUT    /api/nutrition/detail/[entryId] — Update a nutrition entry
 * DELETE /api/nutrition/detail/[entryId] — Delete a nutrition entry
 */

import { ensureDb, notFound, parseBody } from "../../../utils";
import { getNutritionEntry, updateNutritionEntry, deleteNutritionEntry } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  ensureDb();
  const { entryId } = await params;
  const id = parseInt(entryId, 10);
  if (isNaN(id)) return notFound("Invalid entry ID");

  const existing = getNutritionEntry(id);
  if (!existing) return notFound("Nutrition entry not found");

  try {
    const body = await parseBody(req);
    const updated = updateNutritionEntry(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update entry" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  ensureDb();
  const { entryId } = await params;
  const id = parseInt(entryId, 10);
  if (isNaN(id)) return notFound("Invalid entry ID");

  const deleted = deleteNutritionEntry(id);
  if (!deleted) return notFound("Nutrition entry not found");
  return NextResponse.json({ detail: "Nutrition entry deleted" });
}
