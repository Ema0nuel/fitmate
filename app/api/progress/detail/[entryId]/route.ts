/**
 * PUT    /api/progress/detail/[entryId] — Update a progress entry
 * DELETE /api/progress/detail/[entryId] — Delete a progress entry
 */

import { ensureDb, notFound, parseBody } from "../../../utils";
import { getProgressEntry, updateProgressEntry, deleteProgressEntry } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  ensureDb();
  const { entryId } = await params;
  const id = parseInt(entryId, 10);
  if (isNaN(id)) return notFound("Invalid entry ID");

  const existing = getProgressEntry(id);
  if (!existing) return notFound("Progress entry not found");

  try {
    const body = await parseBody(req);
    const updated = updateProgressEntry(id, body);
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

  const deleted = deleteProgressEntry(id);
  if (!deleted) return notFound("Progress entry not found");
  return NextResponse.json({ detail: "Progress entry deleted" });
}
