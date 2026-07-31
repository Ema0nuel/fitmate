/**
 * POST /api/chat — Send a message, get an AI response
 *
 * This is the core endpoint. It will call processChatMessage() from lib/chat.ts
 * once Phase 4 is complete. For now, it returns a placeholder.
 */

import { ensureDb, errorResponse, createdResponse, parseBody } from "../utils";
import { getUser } from "@/lib/db";

export async function POST(req: Request) {
  ensureDb();
  try {
    const body = await parseBody<{
      user_id: number;
      message: string;
      conversation_id?: number | null;
    }>(req);

    if (!body.user_id || !body.message) {
      return errorResponse("user_id and message are required", 400);
    }

    const user = getUser(body.user_id);
    if (!user) return errorResponse("User not found. Complete onboarding first.", 404);

    // Phase 4 will replace this with the full chat pipeline
    // For now, return a stub so the frontend can connect
    const { processChatMessage } = await import("@/lib/chat");
    const result = await processChatMessage(
      body.user_id,
      body.message,
      body.conversation_id ?? null,
    );

    if (result.error === "user_not_found") {
      return errorResponse("User not found. Complete onboarding first.", 404);
    }

    return createdResponse({
      response: result.response,
      conversation_id: result.conversation_id,
      guardrail_triggered: result.guardrail_triggered,
      guardrail_rule: result.guardrail_rule,
      model_used: result.model_used,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to process chat", 500);
  }
}
