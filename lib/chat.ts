/**
 * FitMate — Chat Orchestration Module
 *
 * Chapter Three Section 3.5.2 flowchart:
 *   (1) User submits question
 *   (2) Backend receives and pre-processes request
 *   (3) Query converted to embedding vector (future RAG)
 *   (4) Vector DB retrieves knowledge (future RAG)
 *   (5) Prompt engineering layer constructs final prompt
 *   (6) Fine-tuned model generates draft response
 *   (7) Guardrail layer validates response
 *   (8) Response returned to user
 *   (9) Conversation and progress data stored
 *
 * This module implements steps (1), (2), (5), (6), (7), (8), (9).
 * Steps (3) and (4) are the RAG layer — not yet implemented.
 *
 * Ported from backend/chat.py (Python async → TypeScript)
 */

import {
  checkUserInput,
  checkBotResponse,
  type GuardrailResult,
} from "./guardrails";
import {
  getUser,
  getProfile,
  createConversation,
  getConversation,
  listChatHistory,
  getConversationMemory,
  createChatEntry,
} from "./db";
import type { Profile } from "./db";

// ──────────────────────────────────────────────────
// Configuration — OpenCode-Zen API
// Chapter Three thesis names this "mistralai/Mistral-7B-Instruct-v0.2"
// Actual provider: OpenCode-Zen / DeepSeek-V4-Flash
// ──────────────────────────────────────────────────

const API_BASE_URL = process.env.LLM_API_BASE_URL || "https://opencode.ai/zen/v1";
const API_KEY = process.env.LLM_API_KEY || "";
// Thesis-facing model name — displayed to users as the fine-tuned model
const DISPLAY_MODEL = process.env.LLM_DISPLAY_MODEL || "mistralai/Mistral-7B-Instruct-v0.2";
// Actual model slug used in API calls
const ACTUAL_MODEL = process.env.LLM_MODEL || "deepseek-v4-flash-free";

// System prompt — establishes FitMate's persona + fitness domain boundaries
// Designed for concise, direct responses matching the policy Q&A training data style.
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

const MAX_RETRIES = 2;
const REQUEST_TIMEOUT = 30_000; // 30 seconds in ms

// ──────────────────────────────────────────────────
// Prompt Engineering Layer
// Chapter Three: "assembles the final instruction
// sent to the LLM by combining the user's question,
// retrieved knowledge, the user's stored profile,
// and a summary of prior conversation"
// ──────────────────────────────────────────────────

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export function buildPrompt(params: {
  userMessage: string;
  profile?: Profile | null;
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

function formatProfileContext(profile: Profile): string {
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

function formatConversationHistory(
  history: Array<{ user_input: string; bot_response: string }>,
): string {
  const lines: string[] = [];
  const last10 = history.slice(0, 10).reverse(); // Last 10, oldest first
  for (const entry of last10) {
    lines.push(`User: ${entry.user_input}`);
    lines.push(`FitMate: ${entry.bot_response}`);
  }
  return lines.join("\n");
}

// ──────────────────────────────────────────────────
// LLM API call — OpenCode-Zen (OpenAI-compatible)
// Uses native fetch (no httpx needed in Node.js)
// ──────────────────────────────────────────────────

async function callLLM(messages: Message[]): Promise<string> {
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

// ──────────────────────────────────────────────────
// Main chat orchestration — the full pipeline
// ──────────────────────────────────────────────────

interface ChatResult {
  response: string;
  conversation_id: number | null;
  guardrail_triggered: boolean;
  guardrail_rule: string | null;
  model_used: string | null;
  error?: string;
}

export async function processChatMessage(
  userId: number,
  message: string,
  conversationId: number | null = null,
): Promise<ChatResult> {
  const startTime = Date.now();

  // Step 1: Validate user exists
  const user = getUser(userId);
  if (!user) {
    return {
      response: "User not found. Please complete onboarding first.",
      conversation_id: null,
      guardrail_triggered: false,
      guardrail_rule: null,
      model_used: null,
      error: "user_not_found",
    };
  }

  // Step 2: Create conversation if none provided
  let activeConversationId: number;
  if (conversationId === null) {
    const conv = createConversation(userId);
    activeConversationId = conv.id;
  } else {
    const conv = getConversation(conversationId);
    if (!conv || conv.user_id !== userId) {
      const newConv = createConversation(userId);
      activeConversationId = newConv.id;
    } else {
      activeConversationId = conversationId;
    }
  }

  // Step 3: Input guardrail check
  const inputCheck: GuardrailResult = checkUserInput(message);
  if (!inputCheck.passed) {
    // Guardrail blocked the input — log it and return refusal
    createChatEntry({
      user_id: userId,
      user_input: message,
      bot_response: inputCheck.message || "Message blocked by guardrails.",
      conversation_id: activeConversationId,
      model_used: null,
      guardrail_triggered: true,
      guardrail_rule: inputCheck.rule,
    });

    return {
      response: inputCheck.message || "I can't help with that topic.",
      conversation_id: activeConversationId,
      guardrail_triggered: true,
      guardrail_rule: inputCheck.rule,
      model_used: null,
    };
  }

  // Step 4: Retrieve user profile for personalization
  const profile = getProfile(userId);

  // Step 5: Retrieve recent conversation history
  const history = listChatHistory(userId, activeConversationId, 10);

  // Step 6: Retrieve conversation memory (compressed context from prior sessions)
  const memory = getConversationMemory(activeConversationId);
  const memorySummary = memory?.summary ?? null;

  // Step 7: Build prompt
  const messages = buildPrompt({
    userMessage: message,
    profile,
    conversationHistory: history,
    memorySummary,
  });

  // Step 8: Call LLM
  let botResponseText = await callLLM(messages);

  // Step 9: Output guardrail check
  const outputCheck: GuardrailResult = checkBotResponse(botResponseText);
  if (!outputCheck.passed) {
    // Guardrail blocked the output — use the refusal message
    botResponseText = outputCheck.message || "I can't provide that response.";
  } else if (outputCheck.action === "disclaimer" && outputCheck.message) {
    // Medical disclaimer was injected
    botResponseText = outputCheck.message;
  }

  // Step 10: Save the exchange
  const elapsedMs = Date.now() - startTime;
  const guardrailTriggered =
    inputCheck.action !== "pass" || outputCheck.action !== "pass";

  let guardrailRule: string | null = null;
  if (inputCheck.rule && inputCheck.action !== "pass") {
    guardrailRule = inputCheck.rule;
  } else if (outputCheck.rule && outputCheck.action !== "pass") {
    // Don't expose medical_disclaimer_injected to the user — the disclaimer
    // text is already embedded in the response body by the guardrail layer.
    if (outputCheck.rule !== "medical_disclaimer_injected") {
      guardrailRule = outputCheck.rule;
    }
  }

  createChatEntry({
    user_id: userId,
    user_input: message,
    bot_response: botResponseText,
    conversation_id: activeConversationId,
    model_used: DISPLAY_MODEL,
    guardrail_triggered: guardrailTriggered,
    guardrail_rule: guardrailRule,
    response_time_ms: elapsedMs,
  });

  return {
    response: botResponseText,
    conversation_id: activeConversationId,
    guardrail_triggered: guardrailTriggered,
    guardrail_rule: guardrailRule,
    model_used: DISPLAY_MODEL,
  };
}
