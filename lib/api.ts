/**
 * FitMate — API Client (localStorage-backed)
 *
 * Client-side data layer backed by localStorage.
 * All CRUD operations are local — no server round-trips.
 *
 * The only server call is sendMessage → /api/chat (LLM proxy),
 * because the API key must stay server-side.
 *
 * Function signatures match the original fetch-based API so
 * no frontend components need to change.
 *
 * Onboarding flow:
 *   1. completeOnboarding() → atomic: creates user + profile + goals in localStorage
 *   2. Chat → sendMessage() → fetch /api/chat with profile + history in body
 */

import {
  lsCreateUser,
  lsGetUser,
  lsCreateProfile,
  lsGetProfile,
  lsUpdateProfile,
  lsCreateGoal,
  lsGetGoals,
  lsCreateConversation,
  lsListConversations,
  lsGetConversationDetail,
  lsDeleteConversation,
  lsCreateChatEntry,
  lsListChatHistory,
  lsSetupUser,
} from "./local-store";

// ═══════════════════════════════════════════════════
// Types — unchanged from original API
// ═══════════════════════════════════════════════════

interface UserResponse {
  id: number;
  name: string;
  created_at: string | null;
}

interface ProfileResponse {
  id: number;
  user_id: number;
  age: number | null;
  gender: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  fitness_level: string | null;
  medical_flags: string | null;
  onboarding_complete: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface FitnessGoalResponse {
  id: number;
  user_id: number;
  goal_type: string;
  target_value: number | null;
  target_unit: string | null;
  target_date: string | null;
  description: string | null;
  status: string;
  created_at: string | null;
}

interface OnboardingCompleteResult {
  user: UserResponse;
  profile: ProfileResponse;
  goals: FitnessGoalResponse[];
}

// ═══════════════════════════════════════════════════
// User endpoints
// ═══════════════════════════════════════════════════

export async function createUser(name: string): Promise<UserResponse> {
  if (!name || name.trim().length === 0) {
    throw new Error("Name is required");
  }
  const user = lsCreateUser(name.trim());
  return user;
}

export async function getUser(userId: number): Promise<UserResponse | null> {
  return lsGetUser(userId);
}

// ═══════════════════════════════════════════════════
// Profile endpoints
// ═══════════════════════════════════════════════════

export async function createProfile(payload: {
  user_id: number;
  age?: number | null;
  gender?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  fitness_level?: string | null;
  medical_flags?: string | null;
  onboarding_complete: boolean;
}): Promise<ProfileResponse> {
  const profile = lsCreateProfile(payload);
  return profile;
}

export async function getProfile(userId: number): Promise<ProfileResponse | null> {
  return lsGetProfile(userId);
}

export async function updateProfile(
  userId: number,
  payload: Partial<{
    age: number | null;
    gender: string | null;
    weight_kg: number | null;
    height_cm: number | null;
    fitness_level: string | null;
    medical_flags: string | null;
    onboarding_complete: boolean;
  }>,
): Promise<ProfileResponse> {
  const profile = lsUpdateProfile(userId, payload);
  if (!profile) throw new Error("Profile not found");
  return profile;
}

// ═══════════════════════════════════════════════════
// Fitness Goals endpoints
// ═══════════════════════════════════════════════════

export async function createGoal(payload: {
  user_id: number;
  goal_type: string;
  description?: string;
  target_value?: number | null;
  target_unit?: string | null;
  target_date?: string | null;
  status?: string;
}): Promise<FitnessGoalResponse> {
  return lsCreateGoal({
    ...payload,
    status: payload.status ?? "active",
  });
}

export async function listGoals(userId: number): Promise<FitnessGoalResponse[]> {
  return lsGetGoals(userId);
}

// ═══════════════════════════════════════════════════
// Onboarding — Complete flow (atomic localStorage write)
// ═══════════════════════════════════════════════════

export async function completeOnboarding(data: {
  name: string;
  age?: number | null;
  gender?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  fitness_level?: string | null;
  medical_flags?: string;
  goals: string[];
}): Promise<OnboardingCompleteResult> {
  const result = lsSetupUser(data);
  return {
    user: result.user,
    profile: result.profile,
    goals: result.goals,
  };
}

// ═══════════════════════════════════════════════════
// Health check — always returns true (no server needed)
// ═══════════════════════════════════════════════════

export async function checkHealth(): Promise<boolean> {
  return true;
}

// ═══════════════════════════════════════════════════
// Conversation endpoints
// ═══════════════════════════════════════════════════

interface Conversation {
  id: number;
  user_id: number;
  title: string | null;
  created_at: string | null;
  first_message?: string | null;
}

interface ChatHistoryEntry {
  id: number | string;
  user_id: number;
  conversation_id: number | null;
  user_input: string;
  bot_response: string;
  model_used: string | null;
  guardrail_triggered: boolean;
  guardrail_rule: string | null;
  response_time_ms: number | null;
  created_at: string | null;
}

export async function listConversations(userId: number): Promise<Conversation[]> {
  return lsListConversations(userId);
}

export async function getConversationDetail(
  userId: number,
  conversationId: number,
): Promise<(Conversation & { chat_history: ChatHistoryEntry[] }) | null> {
  return lsGetConversationDetail(userId, conversationId);
}

export async function deleteConversation(
  userId: number,
  conversationId: number,
): Promise<boolean> {
  return lsDeleteConversation(conversationId);
}

// ═══════════════════════════════════════════════════
// Chat History — reads from localStorage
// ═══════════════════════════════════════════════════

export async function getChatHistory(
  userId: number,
  conversationId?: number | null,
  limit?: number,
): Promise<ChatHistoryEntry[]> {
  return lsListChatHistory(userId, conversationId, limit ?? 50);
}

// ═══════════════════════════════════════════════════
// Onboarding status
// ═══════════════════════════════════════════════════

export async function getOnboardingStatus(userId: number): Promise<{ onboarding_complete: boolean }> {
  const profile = lsGetProfile(userId);
  return { onboarding_complete: profile?.onboarding_complete ?? false };
}

// ═══════════════════════════════════════════════════
// Chat — the ONLY server call (LLM proxy)
// ═══════════════════════════════════════════════════

interface ChatMessageResponse {
  response: string;
  conversation_id: number | null;
  guardrail_triggered: boolean;
  guardrail_rule: string | null;
  model_used: string | null;
  error?: string;
}

/**
 * Send a chat message to the AI. Core product endpoint.
 *
 * Sends the user's profile + recent conversation history in the request body
 * so the server can build the LLM prompt without a database.
 * The server is a stateless LLM proxy.
 */
export async function sendMessage(
  userId: number,
  message: string,
  conversationId?: number | null,
  signal?: AbortSignal,
): Promise<ChatMessageResponse> {
  // Get profile and history from localStorage
  const profile = lsGetProfile(userId);
  const history = lsListChatHistory(userId, conversationId ?? null, 10);

  // Format history for the LLM prompt
  const conversation_history = history.map((h) => ({
    user_input: h.user_input,
    bot_response: h.bot_response,
  }));

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      profile,
      conversation_history,
      conversation_id: conversationId ?? null,
    }),
    signal,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to send message" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  const result: ChatMessageResponse = await res.json();

  // Create a new conversation if none existed
  let activeConvId = conversationId ?? result.conversation_id;
  if (!activeConvId) {
    const conv = lsCreateConversation(userId);
    activeConvId = conv.id;
    result.conversation_id = conv.id;
  }

  // Store the exchange in localStorage
  lsCreateChatEntry({
    user_id: userId,
    conversation_id: activeConvId,
    user_input: message,
    bot_response: result.response,
    model_used: result.model_used,
    guardrail_triggered: result.guardrail_triggered,
    guardrail_rule: result.guardrail_rule,
  });

  return result;
}
