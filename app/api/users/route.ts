/**
 * POST /api/users — Create a new user (onboarding step 1)
 * GET  /api/users — List all users (debug / thesis demo)
 */

import { ensureDb, errorResponse, successResponse, createdResponse, parseBody } from "../utils";
import { createUser, listUsers } from "@/lib/db";

export async function POST(req: Request) {
  ensureDb();
  try {
    const body = await parseBody<{ name: string }>(req);
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return errorResponse("Name is required", 400);
    }
    const user = createUser(body.name.trim());
    return createdResponse(user);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to create user", 500);
  }
}

export async function GET() {
  ensureDb();
  try {
    const users = listUsers();
    return successResponse(users);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to list users", 500);
  }
}
