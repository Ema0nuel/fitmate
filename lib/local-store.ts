/**
 * FitMate — Client-Side Data Layer (localStorage)
 *
 * Replaces lib/db.ts (SQLite) for production on Vercel.
 * Vercel serverless has a read-only filesystem, so SQLite cannot persist.
 * All data lives in the browser's localStorage.
 *
 * Storage format: single key "fitmate-data" with a structured JSON object.
 * Auto-generates numeric IDs via counter + Date.now().
 *
 * Trade-off: data is per-browser (no cross-device sync).
 * Acceptable for a thesis demo.
 */

// ═══════════════════════════════════════════════════
// Types — mirror lib/db.ts exports
// ═══════════════════════════════════════════════════

export interface LocalUser {
  id: number;
  name: string;
  created_at: string;
}

export interface LocalProfile {
  id: number;
  user_id: number;
  age: number | null;
  gender: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  fitness_level: string | null;
  medical_flags: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalGoal {
  id: number;
  user_id: number;
  goal_type: string;
  target_value: number | null;
  target_unit: string | null;
  target_date: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

export interface LocalConversation {
  id: number;
  user_id: number;
  title: string | null;
  created_at: string;
  first_message?: string | null;
}

export interface LocalChatEntry {
  id: string;
  user_id: number;
  conversation_id: number | null;
  user_input: string;
  bot_response: string;
  model_used: string | null;
  guardrail_triggered: boolean;
  guardrail_rule: string | null;
  response_time_ms: number | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════
// Storage Schema
// ═══════════════════════════════════════════════════

interface FitMateData {
  users: LocalUser[];
  profiles: LocalProfile[];
  goals: LocalGoal[];
  conversations: LocalConversation[];
  chatHistory: LocalChatEntry[];
  _counters: {
    userId: number;
    profileId: number;
    goalId: number;
    conversationId: number;
  };
}

const STORAGE_KEY = "fitmate-data";

// ═══════════════════════════════════════════════════
// Internal read/write helpers
// ═══════════════════════════════════════════════════

function getDefaultData(): FitMateData {
  return {
    users: [],
    profiles: [],
    goals: [],
    conversations: [],
    chatHistory: [],
    _counters: { userId: 1, profileId: 1, goalId: 1, conversationId: 1 },
  };
}

function readData(): FitMateData {
  if (typeof window === "undefined") return getDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    const data = JSON.parse(raw) as FitMateData;
    // Ensure _counters exists (migration safety)
    if (!data._counters) {
      data._counters = {
        userId: Math.max(1, ...data.users.map((u) => u.id), 0) + 1,
        profileId: Math.max(1, ...data.profiles.map((p) => p.id), 0) + 1,
        goalId: Math.max(1, ...data.goals.map((g) => g.id), 0) + 1,
        conversationId: Math.max(1, ...data.conversations.map((c) => c.id), 0) + 1,
      };
    }
    return data;
  } catch {
    return getDefaultData();
  }
}

function writeData(data: FitMateData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function nextId(data: FitMateData, counter: keyof FitMateData["_counters"]): number {
  const id = data._counters[counter];
  data._counters[counter] = id + 1;
  return id;
}

// ═══════════════════════════════════════════════════
// 1. USERS
// ═══════════════════════════════════════════════════

export function lsCreateUser(name: string): LocalUser {
  const data = readData();
  const user: LocalUser = {
    id: nextId(data, "userId"),
    name,
    created_at: new Date().toISOString(),
  };
  data.users.push(user);
  writeData(data);
  return user;
}

export function lsGetUser(userId: number): LocalUser | null {
  const data = readData();
  return data.users.find((u) => u.id === userId) ?? null;
}

// ═══════════════════════════════════════════════════
// 2. PROFILES
// ═══════════════════════════════════════════════════

export function lsCreateProfile(params: {
  user_id: number;
  age?: number | null;
  gender?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  fitness_level?: string | null;
  medical_flags?: string | null;
  onboarding_complete?: boolean;
}): LocalProfile {
  const data = readData();
  const profile: LocalProfile = {
    id: nextId(data, "profileId"),
    user_id: params.user_id,
    age: params.age ?? null,
    gender: params.gender ?? null,
    weight_kg: params.weight_kg ?? null,
    height_cm: params.height_cm ?? null,
    fitness_level: params.fitness_level ?? null,
    medical_flags: params.medical_flags ?? null,
    onboarding_complete: params.onboarding_complete ?? false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  data.profiles.push(profile);
  writeData(data);
  return profile;
}

export function lsGetProfile(userId: number): LocalProfile | null {
  const data = readData();
  const profile = data.profiles.find((p) => p.user_id === userId) ?? null;
  if (profile) {
    profile.onboarding_complete = Boolean(profile.onboarding_complete);
  }
  return profile;
}

export function lsUpdateProfile(
  userId: number,
  updates: {
    age?: number | null;
    gender?: string | null;
    weight_kg?: number | null;
    height_cm?: number | null;
    fitness_level?: string | null;
    medical_flags?: string | null;
    onboarding_complete?: boolean;
  },
): LocalProfile | null {
  const data = readData();
  const idx = data.profiles.findIndex((p) => p.user_id === userId);
  if (idx === -1) return null;

  const profile = data.profiles[idx];
  const allowed = new Set([
    "age", "gender", "weight_kg", "height_cm",
    "fitness_level", "medical_flags", "onboarding_complete",
  ]);

  for (const [key, val] of Object.entries(updates)) {
    if (allowed.has(key) && val !== undefined) {
      if (key === "onboarding_complete") {
        (profile as unknown as Record<string, unknown>)[key] = val ? 1 : 0;
      } else {
        (profile as unknown as Record<string, unknown>)[key] = val;
      }
    }
  }
  profile.updated_at = new Date().toISOString();
  writeData(data);
  profile.onboarding_complete = Boolean(profile.onboarding_complete);
  return profile;
}

// ═══════════════════════════════════════════════════
// 3. FITNESS GOALS
// ═══════════════════════════════════════════════════

export function lsCreateGoal(params: {
  user_id: number;
  goal_type: string;
  target_value?: number | null;
  target_unit?: string | null;
  target_date?: string | null;
  description?: string | null;
  status?: string;
}): LocalGoal {
  const data = readData();
  const goal: LocalGoal = {
    id: nextId(data, "goalId"),
    user_id: params.user_id,
    goal_type: params.goal_type,
    target_value: params.target_value ?? null,
    target_unit: params.target_unit ?? null,
    target_date: params.target_date ?? null,
    description: params.description ?? null,
    status: params.status ?? "active",
    created_at: new Date().toISOString(),
  };
  data.goals.push(goal);
  writeData(data);
  return goal;
}

export function lsGetGoals(userId: number): LocalGoal[] {
  const data = readData();
  return data.goals
    .filter((g) => g.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ═══════════════════════════════════════════════════
// 4. CONVERSATIONS
// ═══════════════════════════════════════════════════

export function lsCreateConversation(userId: number, title?: string | null): LocalConversation {
  const data = readData();
  const conv: LocalConversation = {
    id: nextId(data, "conversationId"),
    user_id: userId,
    title: title ?? null,
    created_at: new Date().toISOString(),
  };
  data.conversations.push(conv);
  writeData(data);
  return conv;
}

export function lsListConversations(userId: number): LocalConversation[] {
  const data = readData();
  return data.conversations
    .filter((c) => c.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((conv) => {
      // Attach first_message from chat_history
      const firstEntry = data.chatHistory
        .filter((h) => h.conversation_id === conv.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      return {
        ...conv,
        first_message: firstEntry?.user_input ?? null,
      };
    });
}

export function lsGetConversation(
  convId: number,
): LocalConversation | null {
  const data = readData();
  return data.conversations.find((c) => c.id === convId) ?? null;
}

export function lsGetConversationDetail(
  userId: number,
  convId: number,
): { id: number; user_id: number; title: string | null; created_at: string; chat_history: LocalChatEntry[] } | null {
  const data = readData();
  const conv = data.conversations.find((c) => c.id === convId && c.user_id === userId);
  if (!conv) return null;

  const history = data.chatHistory
    .filter((h) => h.conversation_id === convId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return {
    id: conv.id,
    user_id: conv.user_id,
    title: conv.title,
    created_at: conv.created_at,
    chat_history: history,
  };
}

export function lsDeleteConversation(convId: number): boolean {
  const data = readData();
  const idx = data.conversations.findIndex((c) => c.id === convId);
  if (idx === -1) return false;

  data.conversations.splice(idx, 1);
  // Also remove related chat history
  data.chatHistory = data.chatHistory.filter((h) => h.conversation_id !== convId);
  writeData(data);
  return true;
}

export function lsUpdateConversationTitle(convId: number, title: string): LocalConversation | null {
  const data = readData();
  const conv = data.conversations.find((c) => c.id === convId);
  if (!conv) return null;
  conv.title = title;
  writeData(data);
  return conv;
}

// ═══════════════════════════════════════════════════
// 5. CHAT HISTORY
// ═══════════════════════════════════════════════════

export function lsCreateChatEntry(params: {
  user_id: number;
  conversation_id: number | null;
  user_input: string;
  bot_response: string;
  model_used?: string | null;
  guardrail_triggered?: boolean;
  guardrail_rule?: string | null;
  response_time_ms?: number | null;
}): LocalChatEntry {
  const data = readData();
  const entry: LocalChatEntry = {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: params.user_id,
    conversation_id: params.conversation_id ?? null,
    user_input: params.user_input,
    bot_response: params.bot_response,
    model_used: params.model_used ?? null,
    guardrail_triggered: params.guardrail_triggered ?? false,
    guardrail_rule: params.guardrail_rule ?? null,
    response_time_ms: params.response_time_ms ?? null,
    created_at: new Date().toISOString(),
  };
  data.chatHistory.push(entry);
  writeData(data);
  return entry;
}

export function lsListChatHistory(
  userId: number,
  conversationId?: number | null,
  limit: number = 50,
): LocalChatEntry[] {
  const data = readData();
  let entries = data.chatHistory.filter((h) => h.user_id === userId);

  if (conversationId != null) {
    entries = entries.filter((h) => h.conversation_id === conversationId);
  }

  // Return oldest first (for prompt building), but limited
  return entries
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
    .reverse();
}

// ═══════════════════════════════════════════════════
// 6. ATOMIC ONBOARDING — creates user + profile + goals in one write
// ═══════════════════════════════════════════════════

export function lsSetupUser(params: {
  name: string;
  age?: number | null;
  gender?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  fitness_level?: string | null;
  medical_flags?: string;
  goals: string[];
}): {
  user: LocalUser;
  profile: LocalProfile;
  goals: LocalGoal[];
} {
  const data = readData();
  const now = new Date().toISOString();

  // Create user
  const user: LocalUser = {
    id: nextId(data, "userId"),
    name: params.name,
    created_at: now,
  };
  data.users.push(user);

  // Create profile
  const profile: LocalProfile = {
    id: nextId(data, "profileId"),
    user_id: user.id,
    age: params.age ?? null,
    gender: params.gender ?? null,
    weight_kg: params.weight_kg ?? null,
    height_cm: params.height_cm ?? null,
    fitness_level: params.fitness_level ?? null,
    medical_flags: params.medical_flags ?? null,
    onboarding_complete: true,
    created_at: now,
    updated_at: now,
  };
  data.profiles.push(profile);

  // Create goals
  const goals: LocalGoal[] = [];
  for (const goalType of params.goals) {
    const goal: LocalGoal = {
      id: nextId(data, "goalId"),
      user_id: user.id,
      goal_type: goalType,
      target_value: null,
      target_unit: null,
      target_date: null,
      description: goalType.replace(/_/g, " "),
      status: "active",
      created_at: now,
    };
    data.goals.push(goal);
    goals.push(goal);
  }

  writeData(data);

  return {
    user,
    profile: { ...profile, onboarding_complete: true },
    goals,
  };
}
