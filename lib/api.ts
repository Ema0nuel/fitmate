/**
 * FitMate — API Client
 *
 * Thin wrapper around fetch for same-origin Next.js API routes.
 * All routes are served from the same server — no CORS, no cross-origin.
 *
 * Maps to Chapter Three Section 3.5.4 database entities.
 *
 * Onboarding flow:
 *   1. POST /api/users        → creates user (name), returns user_id
 *   2. POST /api/profiles     → creates profile (body stats, fitness level)
 *   3. POST /api/goals        → creates each fitness goal
 */

// ═══════════════════════════════════════════════════
// Types — aligned with backend Pydantic models
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

/**
 * Create a new user. Called first during onboarding.
 * Backend returns the user_id needed for subsequent profile/goal creation.
 */
export async function createUser(name: string): Promise<UserResponse> {
  const res = await fetch(`/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to create user" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch a user by ID.
 */
export async function getUser(userId: number): Promise<UserResponse | null> {
  const res = await fetch(`/api/users/${userId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ═══════════════════════════════════════════════════
// Profile endpoints
// ═══════════════════════════════════════════════════

/**
 * Create a user profile after onboarding.
 * Requires a valid user_id from createUser.
 */
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
  const res = await fetch(`/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to create profile" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch a profile by user ID.
 */
export async function getProfile(userId: number): Promise<ProfileResponse | null> {
  const res = await fetch(`/api/profiles/${userId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Update a profile. Partial updates supported.
 */
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
  }>
): Promise<ProfileResponse> {
  const res = await fetch(`/api/profiles/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to update profile" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ═══════════════════════════════════════════════════
// Fitness Goals endpoints
// ═══════════════════════════════════════════════════

/**
 * Create a fitness goal for a user.
 */
export async function createGoal(payload: {
  user_id: number;
  goal_type: string;
  description?: string;
  target_value?: number | null;
  target_unit?: string | null;
  target_date?: string | null;
  status?: string;
}): Promise<FitnessGoalResponse> {
  const res = await fetch(`/api/goals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "active", ...payload }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to create goal" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * List fitness goals for a user.
 */
export async function listGoals(userId: number): Promise<FitnessGoalResponse[]> {
  const res = await fetch(`/api/goals/${userId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ═══════════════════════════════════════════════════
// Onboarding — Complete flow
// ═══════════════════════════════════════════════════

/**
 * Complete the full onboarding flow:
 *   1. Create user (name)
 *   2. Create profile (body stats + fitness level + medical)
 *   3. Create each fitness goal
 *
 * Returns all created entities for store hydration.
 * If any step fails, throws with context about which step failed.
 */
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
  // Step 1: Create user
  let user: UserResponse;
  try {
    user = await createUser(data.name);
  } catch (err) {
    throw new Error(`Failed to create user: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  // Step 2: Create profile
  let profile: ProfileResponse;
  try {
    profile = await createProfile({
      user_id: user.id,
      age: data.age,
      gender: data.gender,
      weight_kg: data.weight_kg,
      height_cm: data.height_cm,
      fitness_level: data.fitness_level,
      medical_flags: data.medical_flags || null,
      onboarding_complete: true,
    });
  } catch (err) {
    throw new Error(`Failed to create profile: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  // Step 3: Create goals (best-effort — don't fail onboarding if goals fail)
  const goals: FitnessGoalResponse[] = [];
  for (const goalType of data.goals) {
    try {
      const goal = await createGoal({
        user_id: user.id,
        goal_type: goalType,
        description: goalType.replace(/_/g, " "),
      });
      goals.push(goal);
    } catch (err) {
      console.warn(`Failed to create goal "${goalType}":`, err);
    }
  }

  return { user, profile, goals };
}

// ═══════════════════════════════════════════════════
// Health check
// ═══════════════════════════════════════════════════

/**
 * Check backend health.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════
// Chat endpoints
// ═══════════════════════════════════════════════════

interface ChatMessageResponse {
  response: string;
  conversation_id: number | null;
  guardrail_triggered: boolean;
  guardrail_rule: string | null;
  model_used: string | null;
  error?: string;
}

interface ChatHistoryEntry {
  id: number;
  user_id: number;
  conversation_id: number;
  user_input: string;
  bot_response: string;
  model_used: string | null;
  guardrail_triggered: boolean;
  guardrail_rule: string | null;
  response_time_ms: number | null;
  created_at: string | null;
}

interface Conversation {
  id: number;
  user_id: number;
  title: string | null;
  created_at: string | null;
}

/**
 * Send a chat message to the AI. Core product endpoint.
 * Returns the AI response + metadata (guardrail status, model used).
 *
 * Pass an AbortSignal to allow cancellation (e.g. user clicks pause).
 */
export async function sendMessage(
  userId: number,
  message: string,
  conversationId?: number | null,
  signal?: AbortSignal,
): Promise<ChatMessageResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      message,
      conversation_id: conversationId ?? null,
    }),
    signal,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to send message" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * List conversations for a user (chat history overview).
 */
export async function listConversations(userId: number): Promise<Conversation[]> {
  const res = await fetch(`/api/conversations/${userId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Get a single conversation with its full chat history.
 */
export async function getConversationDetail(
  userId: number,
  conversationId: number,
): Promise<(Conversation & { chat_history: ChatHistoryEntry[] }) | null> {
  const res = await fetch(`/api/conversations/${userId}?conversationId=${conversationId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Get chat history for a user within a conversation.
 */
export async function getChatHistory(
  userId: number,
  conversationId?: number | null,
  limit?: number,
): Promise<ChatHistoryEntry[]> {
  const params = new URLSearchParams();
  if (conversationId != null) params.set("conversation_id", String(conversationId));
  if (limit != null) params.set("limit", String(limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/conversations/${userId}/chat-history${query}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Get onboarding status for a user.
 */
export async function getOnboardingStatus(userId: number): Promise<{ onboarding_complete: boolean }> {
  const res = await fetch(`/api/onboarding/status?user_id=${userId}`);
  if (res.status === 404) return { onboarding_complete: false };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
