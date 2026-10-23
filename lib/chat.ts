/**
 * FitMate — Chat Module (Stateless)
 *
 * Provides prompt engineering, LLM API call, and guardrail integration.
 * No database dependencies — all context is passed in as parameters.
 *
 * Chapter Three Section 3.5.2 flowchart:
 *   (5) Prompt engineering layer constructs final prompt
 *   (6) Fine-tuned model generates draft response
 *   (7) Guardrail layer validates response
 *
 * Used by: app/api/chat/route.ts (the stateless LLM proxy)
 */

import "server-only";

import { checkUserInput, checkBotResponse } from "./guardrails";

export { checkUserInput, checkBotResponse };

// ──────────────────────────────────────────────────
// Configuration — OpenRouter API (OpenAI-compatible)
// ──────────────────────────────────────────────────

const API_BASE_URL = process.env.LLM_API_BASE_URL || "https://openrouter.ai/api/v1";
const API_KEY = process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY || "";
const ACTUAL_MODEL = process.env.LLM_MODEL || "openrouter/free";

const MAX_RETRIES = 2;
const REQUEST_TIMEOUT = 30_000;

export interface LLMCompletion {
  content: string;
  model: string;
}

export class LLMServiceError extends Error {
  constructor(
    message: string,
    public readonly status: 502 | 503 | 504,
  ) {
    super(message);
    this.name = "LLMServiceError";
  }
}

// ──────────────────────────────────────────────────
// System prompt
// ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are FitMate, a fitness assistant. Answer fitness, exercise, nutrition, and health questions.

RESPONSE RULES:
- Keep answers concise: 2-4 sentences unless the user explicitly asks for more detail.
- Be direct. State the answer first, then briefly explain why.
- Never echo back user profile data (age, weight, height, gender) unless it is directly relevant to the answer.
- Never use emojis.
- Never start with greetings ("Hey there!", "Great question!", "Hi!").
- Never say "It looks like your message got cut off" or ask what the user meant.
- Never say "I'm here to help with..." or list what you can do.
- Spell out acronyms on first use in each response.
- If a user message is unclear or too short, give a brief, helpful response based on what you can infer — do not ask them to retype.
- For medical concerns, briefly redirect to a healthcare professional. Do not add long disclaimers.
- Never discuss politics, religion, coding, relationships, or non-fitness topics.`;

// ──────────────────────────────────────────────────
// Profile type — minimal interface for prompt building
// (matches the profile object sent from the client)
// ──────────────────────────────────────────────────

export interface PromptProfile {
  age?: number | null;
  gender?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  fitness_level?: string | null;
  medical_flags?: string | null;
}

// ──────────────────────────────────────────────────
// Prompt Engineering Layer
// ──────────────────────────────────────────────────

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export function buildPrompt(params: {
  userMessage: string;
  profile?: PromptProfile | null;
  conversationHistory?: Array<{ user_input: string; bot_response: string }>;
  memorySummary?: string | null;
}): Message[] {
  const { userMessage, profile, conversationHistory, memorySummary } = params;

  const messages: Message[] = [{ role: "system", content: SYSTEM_PROMPT }];

  // Inject user profile for personalization
  if (profile) {
    const profileContext = formatProfileContext(profile);
    messages.push({
      role: "system",
      content: `Current user profile:\n${profileContext}`,
    });
  }

  // Inject conversation memory (compressed context from prior sessions)
  if (memorySummary) {
    messages.push({
      role: "system",
      content: `Context from previous conversations:\n${memorySummary}`,
    });
  }

  // Inject recent conversation history (last few exchanges for multi-turn)
  if (conversationHistory && conversationHistory.length > 0) {
    const historyText = formatConversationHistory(conversationHistory);
    messages.push({
      role: "system",
      content: `Recent conversation:\n${historyText}`,
    });
  }

  // The actual user message
  messages.push({ role: "user", content: userMessage });

  return messages;
}

export function formatProfileContext(profile: PromptProfile): string {
  const parts: string[] = [];
  if (profile.age && profile.gender) {
    parts.push(`${profile.age}${profile.gender === "male" ? "M" : profile.gender === "female" ? "F" : ""}`);
  } else {
    if (profile.age) parts.push(`age ${profile.age}`);
    if (profile.gender) parts.push(profile.gender);
  }
  if (profile.weight_kg) parts.push(`${profile.weight_kg}kg`);
  if (profile.height_cm) parts.push(`${profile.height_cm}cm`);
  if (profile.fitness_level) parts.push(profile.fitness_level);
  if (profile.medical_flags) parts.push(`medical: ${profile.medical_flags}`);
  return parts.length > 0 ? `User profile: ${parts.join(", ")}` : "No profile data.";
}

export function formatConversationHistory(
  history: Array<{ user_input: string; bot_response: string }>,
): string {
  const lines: string[] = [];
  const last10 = history.slice(0, 10).reverse();
  for (const entry of last10) {
    lines.push(`User: ${entry.user_input}`);
    lines.push(`FitMate: ${entry.bot_response}`);
  }
  return lines.join("\n");
}

// ──────────────────────────────────────────────────
// LLM API call — OpenRouter (OpenAI-compatible)
// ──────────────────────────────────────────────────

export async function callLLMWithMetadata(messages: Message[]): Promise<LLMCompletion> {
  if (!API_KEY) {
    throw new LLMServiceError("OpenRouter API key is missing.", 503);
  }

  const payload = {
    model: ACTUAL_MODEL,
    messages,
    max_tokens: 1024,
    temperature: 0.7,
    top_p: 0.9,
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_X_TITLE || "FitMate",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const isTransient = response.status === 429 || response.status >= 500;
        if (isTransient && attempt < MAX_RETRIES - 1) continue;
        throw new LLMServiceError(
          `OpenRouter request failed with HTTP ${response.status}.`,
          502,
        );
      }

      let data: {
        model?: unknown;
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      try {
        data = await response.json();
      } catch {
        throw new LLMServiceError("OpenRouter returned invalid JSON.", 502);
      }

      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim().length === 0) {
        throw new LLMServiceError("OpenRouter returned an empty response.", 502);
      }

      return {
        content,
        model: typeof data.model === "string" && data.model.trim()
          ? data.model
          : ACTUAL_MODEL,
      };
    } catch (err) {
      if (err instanceof LLMServiceError) throw err;

      const isTimeout = err instanceof Error && err.name === "AbortError";
      if (attempt < MAX_RETRIES - 1) continue;

      throw new LLMServiceError(
        isTimeout
          ? "OpenRouter request timed out."
          : "OpenRouter request failed.",
        isTimeout ? 504 : 502,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new LLMServiceError("OpenRouter request failed.", 502);
}

export async function callLLM(messages: Message[]): Promise<string> {
  const completion = await callLLMWithMetadata(messages);
  return completion.content;
}
