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

import { checkUserInput, checkBotResponse } from "./guardrails";

export { checkUserInput, checkBotResponse };

// ──────────────────────────────────────────────────
// Configuration — OpenCode-Zen API
// ──────────────────────────────────────────────────

const API_BASE_URL = process.env.LLM_API_BASE_URL || "https://opencode.ai/zen/v1";
const API_KEY = process.env.LLM_API_KEY || "";
export const DISPLAY_MODEL = process.env.LLM_DISPLAY_MODEL || "mistralai/Mistral-7B-Instruct-v0.2";
const ACTUAL_MODEL = process.env.LLM_MODEL || "nemotron-3-ultra-free";

const MAX_RETRIES = 2;
const REQUEST_TIMEOUT = 30_000;

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
// LLM API call — OpenCode-Zen (OpenAI-compatible)
// ──────────────────────────────────────────────────

export async function callLLM(messages: Message[]): Promise<string> {
  if (!API_KEY) {
    return (
      "I'm FitMate, your fitness assistant! The AI model is not yet " +
      "configured. Please set the LLM_API_KEY environment variable to " +
      "connect to the inference service. In the meantime, I can tell you " +
      "that I'm designed to help with exercise, nutrition, and fitness " +
      "questions based on WHO, ACE, and HHS guidelines."
    );
  }

  const payload = {
    model: ACTUAL_MODEL,
    messages,
    max_tokens: 1024,
    temperature: 0.7,
    top_p: 0.9,
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (attempt < MAX_RETRIES - 1) continue;
        return (
          `I'm experiencing a technical issue with the AI service ` +
          `(HTTP ${response.status}). Please try again shortly.`
        );
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) continue;

      if (err instanceof DOMException && err.name === "AbortError") {
        return (
          "I'm sorry, the AI service timed out. Please try again. " +
          "If this persists, the inference service may be temporarily unavailable."
        );
      }

      return (
        "I'm experiencing a technical issue connecting to the AI service. " +
        "Please try again shortly."
      );
    }
  }

  return "I'm unable to generate a response right now. Please try again.";
}
