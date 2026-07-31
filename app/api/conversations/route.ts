/**
 * POST /api/conversations — Create a new conversation
 */

import { ensureDb, errorResponse, createdResponse, parseBody } from "../utils";
import { createConversation } from "@/lib/db";

export async function POST(req: Request) {
  ensureDb();
  try {
    const body = await parseBody<{
      user_id: number;
      title?: string | null;
    }>(req);

    if (!body.user_id) {
      return errorResponse("user_id is required", 400);
    }

    const conv = createConversation(body.user_id, body.title);
    return createdResponse(conv);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to create conversation", 500);
  }
}
