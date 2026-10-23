/**
 * POST /api/chat — Stateless LLM Proxy
 *
 * Receives the user's message + context (profile, conversation history)
 * in the request body. Builds a prompt, calls the LLM, runs guardrails,
 * and returns the response. No database — the client owns all state.
 *
 * Chapter Three Section 3.5.2 flowchart:
 *   (4) User message + context → this endpoint
 *   (5) Prompt engineering layer constructs final prompt
 *   (6) Fine-tuned model generates draft response
 *   (7) Guardrail layer validates response
 *   (8) Final response → client stores in localStorage
 */

import {
  buildPrompt,
  callLLMWithMetadata,
  LLMServiceError,
  checkUserInput,
  checkBotResponse,
} from "@/lib/chat";
import { errorResponse, createdResponse, parseBody } from "../utils";

export async function POST(req: Request) {
  try {
    const body = await parseBody<{
      message: string;
      profile?: {
        age?: number | null;
        gender?: string | null;
        weight_kg?: number | null;
        height_cm?: number | null;
        fitness_level?: string | null;
        medical_flags?: string | null;
      } | null;
      conversation_history?: Array<{ user_input: string; bot_response: string }>;
      conversation_id?: number | null;
    }>(req);

    if (!body.message || body.message.trim().length === 0) {
      return errorResponse("message is required", 400);
    }

    // ── Step 1: Input guardrails ──────────────────
    const inputCheck = checkUserInput(body.message);
    if (!inputCheck.passed) {
      return createdResponse({
        response: inputCheck.message,
        conversation_id: body.conversation_id ?? null,
        guardrail_triggered: true,
        guardrail_rule: inputCheck.rule,
        model_used: null,
      });
    }

    // ── Step 2: Build prompt from client-provided context ──
    const messages = buildPrompt({
      userMessage: body.message,
      profile: body.profile,
      conversationHistory: body.conversation_history,
    });

    // ── Step 3: Call LLM ─────────────────────────
    const completion = await callLLMWithMetadata(messages);

    // ── Step 4: Output guardrails ─────────────────
    const outputCheck = checkBotResponse(completion.content);
    const guardedResponse = outputCheck.passed
      ? completion.content
      : outputCheck.message;

    return createdResponse({
      response: guardedResponse,
      conversation_id: body.conversation_id ?? null,
      guardrail_triggered: !outputCheck.passed,
      guardrail_rule: !outputCheck.passed ? outputCheck.rule : null,
      model_used: completion.model,
    });
  } catch (err) {
    console.error("[chat] error:", err instanceof Error ? err.message : String(err));

    if (err instanceof LLMServiceError) {
      const detail = err.status === 503
        ? "AI service is not configured."
        : err.status === 504
          ? "AI service timed out. Please try again."
          : "AI service is temporarily unavailable.";
      return errorResponse(detail, err.status);
    }

    return errorResponse("Failed to process chat", 500);
  }
}
