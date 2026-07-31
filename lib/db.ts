/**
 * FitMate — SQLite Database Layer
 *
 * Handles connection management, table creation, and CRUD operations
 * for all Chapter Three Section 3.5.4 entities:
 *   1. users
 *   2. profiles
 *   3. fitness_goals
 *   4. conversations
 *   5. workout_plans
 *   6. workout_exercises
 *   7. nutrition_entries
 *   8. chat_history
 *   9. conversation_memory
 *   10. progress_entries
 *   11. exercises (reference catalog)
 *
 * Uses better-sqlite3 (synchronous, singleton pattern).
 * Ported from backend/database.py (Python async → Node sync).
 */

import Database from "better-sqlite3";
import path from "path";

// ──────────────────────────────────────────────────
// Connection — singleton pattern
// ──────────────────────────────────────────────────

const DB_PATH = process.env.DATABASE_PATH || "./fitmate.db";

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

// ═══════════════════════════════════════════════════
// Table Creation — all Chapter Three entities
// ═══════════════════════════════════════════════════

export function initDatabase(): void {
  const db = getDb();

  // 1. USERS — identity records
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. PROFILES — body stats, fitness level, medical flags
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      age INTEGER,
      gender TEXT CHECK(gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
      weight_kg REAL,
      height_cm REAL,
      fitness_level TEXT CHECK(fitness_level IN ('beginner', 'intermediate', 'advanced')),
      medical_flags TEXT,
      onboarding_complete INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 3. FITNESS GOALS — Chapter Three entity
  db.exec(`
    CREATE TABLE IF NOT EXISTS fitness_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      goal_type TEXT NOT NULL,
      target_value REAL,
      target_unit TEXT,
      target_date TEXT,
      description TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'abandoned')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 4. CONVERSATIONS — groups chat messages into sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 5. WORKOUT PLANS — routines
  db.exec(`
    CREATE TABLE IF NOT EXISTS workout_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      days_per_week INTEGER,
      duration_weeks INTEGER,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 6. WORKOUT EXERCISES — exercises within a plan
  db.exec(`
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_plan_id INTEGER NOT NULL,
      exercise_name TEXT NOT NULL,
      sets INTEGER,
      reps INTEGER,
      duration_seconds INTEGER,
      rest_seconds INTEGER,
      notes TEXT,
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (workout_plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
    )
  `);

  // 7. NUTRITION ENTRIES — meal entries + macros
  db.exec(`
    CREATE TABLE IF NOT EXISTS nutrition_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      description TEXT NOT NULL,
      calories REAL,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 8. CHAT HISTORY — every user-agent exchange with guardrail audit
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      conversation_id INTEGER,
      user_input TEXT NOT NULL,
      bot_response TEXT NOT NULL,
      model_used TEXT,
      guardrail_triggered INTEGER DEFAULT 0,
      guardrail_rule TEXT,
      response_time_ms INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
    )
  `);

  // 9. CONVERSATION MEMORY — compressed dialogue summaries
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      conversation_id INTEGER NOT NULL,
      summary TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  // 10. PROGRESS ENTRIES — periodic measurements
  db.exec(`
    CREATE TABLE IF NOT EXISTS progress_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      weight_kg REAL,
      body_fat_pct REAL,
      bench_press_max_kg REAL,
      squat_max_kg REAL,
      deadlift_max_kg REAL,
      run_time_seconds INTEGER,
      push_ups INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 11. EXERCISES — reference catalog for exercise library
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      muscle_group TEXT,
      equipment TEXT,
      difficulty TEXT CHECK(difficulty IN ('beginner', 'intermediate', 'advanced'))
    )
  `);
}

// ═══════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════

export interface User {
  id: number;
  name: string;
  created_at: string;
}

export interface Profile {
  id: number;
  user_id: number;
  age: number | null;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  weight_kg: number | null;
  height_cm: number | null;
  fitness_level: "beginner" | "intermediate" | "advanced" | null;
  medical_flags: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface FitnessGoal {
  id: number;
  user_id: number;
  goal_type: string;
  target_value: number | null;
  target_unit: string | null;
  target_date: string | null;
  description: string | null;
  status: "active" | "completed" | "abandoned";
  created_at: string;
}

export interface Conversation {
  id: number;
  user_id: number;
  title: string | null;
  created_at: string;
}

export interface WorkoutPlan {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  days_per_week: number | null;
  duration_weeks: number | null;
  status: "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: number;
  workout_plan_id: number;
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  notes: string | null;
  order_index: number;
}

export interface NutritionEntry {
  id: number;
  user_id: number;
  date: string;
  meal_type: string;
  description: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  notes: string | null;
  created_at: string;
}

export interface ChatHistoryEntry {
  id: number;
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

export interface ConversationMemory {
  id: number;
  user_id: number;
  conversation_id: number;
  summary: string;
  created_at: string;
  conversation_title?: string | null;
}

export interface ProgressEntry {
  id: number;
  user_id: number;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  bench_press_max_kg: number | null;
  squat_max_kg: number | null;
  deadlift_max_kg: number | null;
  run_time_seconds: number | null;
  push_ups: number | null;
  notes: string | null;
  created_at: string;
}

export interface Exercise {
  id: number;
  name: string;
  description: string | null;
  muscle_group: string | null;
  equipment: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
}

// ═══════════════════════════════════════════════════
// 1. USERS CRUD
// ═══════════════════════════════════════════════════

export function createUser(name: string): User {
  const db = getDb();
  const stmt = db.prepare("INSERT INTO users (name) VALUES (?)");
  const result = stmt.run(name);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid) as User;
}

export function getUser(userId: number): User | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(userId) as User | undefined;
}

export function listUsers(): User[] {
  return getDb().prepare("SELECT * FROM users ORDER BY id").all() as User[];
}

// ═══════════════════════════════════════════════════
// 2. PROFILES CRUD
// ═══════════════════════════════════════════════════

export function createProfile(params: {
  user_id: number;
  age?: number | null;
  gender?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  fitness_level?: string | null;
  medical_flags?: string | null;
  onboarding_complete?: boolean;
}): Profile {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO profiles
    (user_id, age, gender, weight_kg, height_cm, fitness_level, medical_flags, onboarding_complete)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    params.user_id,
    params.age ?? null,
    params.gender ?? null,
    params.weight_kg ?? null,
    params.height_cm ?? null,
    params.fitness_level ?? null,
    params.medical_flags ?? null,
    params.onboarding_complete ? 1 : 0,
  );
  return db.prepare("SELECT * FROM profiles WHERE id = ?").get(result.lastInsertRowid) as Profile;
}

export function getProfile(userId: number): Profile | undefined {
  const row = getDb().prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId) as Profile | undefined;
  if (row) {
    row.onboarding_complete = Boolean(row.onboarding_complete);
  }
  return row;
}

export function getProfileById(profileId: number): Profile | undefined {
  const row = getDb().prepare("SELECT * FROM profiles WHERE id = ?").get(profileId) as Profile | undefined;
  if (row) {
    row.onboarding_complete = Boolean(row.onboarding_complete);
  }
  return row;
}

export function updateProfile(userId: number, updates: {
  age?: number | null;
  gender?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  fitness_level?: string | null;
  medical_flags?: string | null;
  onboarding_complete?: boolean;
}): Profile | undefined {
  const db = getDb();
  const allowed = new Set([
    "age", "gender", "weight_kg", "height_cm",
    "fitness_level", "medical_flags", "onboarding_complete",
  ]);

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (allowed.has(key) && val !== undefined && val !== null) {
      if (key === "onboarding_complete") {
        setClauses.push(`${key} = ?`);
        values.push(val ? 1 : 0);
      } else {
        setClauses.push(`${key} = ?`);
        values.push(val);
      }
    }
  }

  if (setClauses.length === 0) {
    return getProfile(userId);
  }

  setClauses.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(userId);

  db.prepare(`UPDATE profiles SET ${setClauses.join(", ")} WHERE user_id = ?`).run(...values);
  return getProfile(userId);
}

// ═══════════════════════════════════════════════════
// 3. FITNESS GOALS CRUD
// ═══════════════════════════════════════════════════

export function createFitnessGoal(params: {
  user_id: number;
  goal_type: string;
  target_value?: number | null;
  target_unit?: string | null;
  target_date?: string | null;
  description?: string | null;
  status?: string;
}): FitnessGoal {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO fitness_goals
    (user_id, goal_type, target_value, target_unit, target_date, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    params.user_id,
    params.goal_type,
    params.target_value ?? null,
    params.target_unit ?? null,
    params.target_date ?? null,
    params.description ?? null,
    params.status ?? "active",
  );
  return db.prepare("SELECT * FROM fitness_goals WHERE id = ?").get(result.lastInsertRowid) as FitnessGoal;
}

export function getFitnessGoals(userId: number, status?: string): FitnessGoal[] {
  const db = getDb();
  if (status) {
    return db.prepare(
      "SELECT * FROM fitness_goals WHERE user_id = ? AND status = ? ORDER BY created_at DESC"
    ).all(userId, status) as FitnessGoal[];
  }
  return db.prepare(
    "SELECT * FROM fitness_goals WHERE user_id = ? ORDER BY created_at DESC"
  ).all(userId) as FitnessGoal[];
}

export function getFitnessGoal(goalId: number): FitnessGoal | undefined {
  return getDb().prepare("SELECT * FROM fitness_goals WHERE id = ?").get(goalId) as FitnessGoal | undefined;
}

export function updateFitnessGoal(goalId: number, updates: {
  goal_type?: string;
  target_value?: number | null;
  target_unit?: string | null;
  target_date?: string | null;
  description?: string | null;
  status?: string;
}): FitnessGoal | undefined {
  const db = getDb();
  const allowed = new Set(["goal_type", "target_value", "target_unit", "target_date", "description", "status"]);

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (allowed.has(key) && val !== undefined && val !== null) {
      setClauses.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (setClauses.length === 0) {
    return getFitnessGoal(goalId);
  }

  values.push(goalId);
  db.prepare(`UPDATE fitness_goals SET ${setClauses.join(", ")} WHERE id = ?`).run(...values);
  return getFitnessGoal(goalId);
}

export function deleteFitnessGoal(goalId: number): boolean {
  const result = getDb().prepare("DELETE FROM fitness_goals WHERE id = ?").run(goalId);
  return result.changes > 0;
}

// ═══════════════════════════════════════════════════
// 4. CONVERSATIONS CRUD
// ═══════════════════════════════════════════════════

export function createConversation(userId: number, title?: string | null): Conversation {
  const db = getDb();
  const result = db.prepare("INSERT INTO conversations (user_id, title) VALUES (?, ?)").run(userId, title ?? null);
  return db.prepare("SELECT * FROM conversations WHERE id = ?").get(result.lastInsertRowid) as Conversation;
}

export function getConversation(conversationId: number): Conversation | undefined {
  return getDb().prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId) as Conversation | undefined;
}

export function listConversations(userId: number): Conversation[] {
  return getDb().prepare(
    "SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC"
  ).all(userId) as Conversation[];
}

export function updateConversationTitle(conversationId: number, title: string): Conversation | undefined {
  getDb().prepare("UPDATE conversations SET title = ? WHERE id = ?").run(title, conversationId);
  return getConversation(conversationId);
}

// ═══════════════════════════════════════════════════
// 5. WORKOUT PLANS CRUD
// ═══════════════════════════════════════════════════

export function createWorkoutPlan(params: {
  user_id: number;
  name: string;
  description?: string | null;
  days_per_week?: number | null;
  duration_weeks?: number | null;
  status?: string;
}): WorkoutPlan {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO workout_plans
    (user_id, name, description, days_per_week, duration_weeks, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    params.user_id,
    params.name,
    params.description ?? null,
    params.days_per_week ?? null,
    params.duration_weeks ?? null,
    params.status ?? "active",
  );
  return db.prepare("SELECT * FROM workout_plans WHERE id = ?").get(result.lastInsertRowid) as WorkoutPlan;
}

export function getWorkoutPlan(planId: number): WorkoutPlan | undefined {
  return getDb().prepare("SELECT * FROM workout_plans WHERE id = ?").get(planId) as WorkoutPlan | undefined;
}

export function listWorkoutPlans(userId: number, status?: string): WorkoutPlan[] {
  const db = getDb();
  if (status) {
    return db.prepare(
      "SELECT * FROM workout_plans WHERE user_id = ? AND status = ? ORDER BY created_at DESC"
    ).all(userId, status) as WorkoutPlan[];
  }
  return db.prepare(
    "SELECT * FROM workout_plans WHERE user_id = ? ORDER BY created_at DESC"
  ).all(userId) as WorkoutPlan[];
}

export function updateWorkoutPlan(planId: number, updates: {
  name?: string;
  description?: string | null;
  days_per_week?: number | null;
  duration_weeks?: number | null;
  status?: string;
}): WorkoutPlan | undefined {
  const db = getDb();
  const allowed = new Set(["name", "description", "days_per_week", "duration_weeks", "status"]);

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (allowed.has(key) && val !== undefined && val !== null) {
      setClauses.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (setClauses.length === 0) {
    return getWorkoutPlan(planId);
  }

  setClauses.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(planId);

  db.prepare(`UPDATE workout_plans SET ${setClauses.join(", ")} WHERE id = ?`).run(...values);
  return getWorkoutPlan(planId);
}

export function deleteWorkoutPlan(planId: number): boolean {
  const result = getDb().prepare("DELETE FROM workout_plans WHERE id = ?").run(planId);
  return result.changes > 0;
}

// ═══════════════════════════════════════════════════
// 6. WORKOUT EXERCISES CRUD
// ═══════════════════════════════════════════════════

export function createWorkoutExercise(params: {
  workout_plan_id: number;
  exercise_name: string;
  sets?: number | null;
  reps?: number | null;
  duration_seconds?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
  order_index?: number;
}): WorkoutExercise {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO workout_exercises
    (workout_plan_id, exercise_name, sets, reps, duration_seconds, rest_seconds, notes, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    params.workout_plan_id,
    params.exercise_name,
    params.sets ?? null,
    params.reps ?? null,
    params.duration_seconds ?? null,
    params.rest_seconds ?? null,
    params.notes ?? null,
    params.order_index ?? 0,
  );
  return db.prepare("SELECT * FROM workout_exercises WHERE id = ?").get(result.lastInsertRowid) as WorkoutExercise;
}

export function listWorkoutExercises(workoutPlanId: number): WorkoutExercise[] {
  return getDb().prepare(
    "SELECT * FROM workout_exercises WHERE workout_plan_id = ? ORDER BY order_index"
  ).all(workoutPlanId) as WorkoutExercise[];
}

export function deleteWorkoutExercise(exerciseId: number): boolean {
  const result = getDb().prepare("DELETE FROM workout_exercises WHERE id = ?").run(exerciseId);
  return result.changes > 0;
}

// ═══════════════════════════════════════════════════
// 7. EXERCISES (catalog) CRUD
// ═══════════════════════════════════════════════════

export function createExercise(params: {
  name: string;
  description?: string | null;
  muscle_group?: string | null;
  equipment?: string | null;
  difficulty?: string | null;
}): Exercise {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO exercises (name, description, muscle_group, equipment, difficulty)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    params.name,
    params.description ?? null,
    params.muscle_group ?? null,
    params.equipment ?? null,
    params.difficulty ?? null,
  );
  return db.prepare("SELECT * FROM exercises WHERE id = ?").get(result.lastInsertRowid) as Exercise;
}

export function listExercises(muscleGroup?: string): Exercise[] {
  const db = getDb();
  if (muscleGroup) {
    return db.prepare(
      "SELECT * FROM exercises WHERE muscle_group = ? ORDER BY name"
    ).all(muscleGroup) as Exercise[];
  }
  return db.prepare("SELECT * FROM exercises ORDER BY name").all() as Exercise[];
}

export function searchExercises(query: string): Exercise[] {
  return getDb().prepare(
    "SELECT * FROM exercises WHERE name LIKE ? ORDER BY name"
  ).all(`%${query}%`) as Exercise[];
}

// ═══════════════════════════════════════════════════
// 8. NUTRITION ENTRIES CRUD
// ═══════════════════════════════════════════════════

export function createNutritionEntry(params: {
  user_id: number;
  date: string;
  meal_type: string;
  description: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  notes?: string | null;
}): NutritionEntry {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO nutrition_entries
    (user_id, date, meal_type, description, calories, protein_g, carbs_g, fat_g, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    params.user_id,
    params.date,
    params.meal_type,
    params.description,
    params.calories ?? null,
    params.protein_g ?? null,
    params.carbs_g ?? null,
    params.fat_g ?? null,
    params.notes ?? null,
  );
  return db.prepare("SELECT * FROM nutrition_entries WHERE id = ?").get(result.lastInsertRowid) as NutritionEntry;
}

export function listNutritionEntries(userId: number, date?: string): NutritionEntry[] {
  const db = getDb();
  if (date) {
    return db.prepare(
      "SELECT * FROM nutrition_entries WHERE user_id = ? AND date = ? ORDER BY created_at"
    ).all(userId, date) as NutritionEntry[];
  }
  return db.prepare(
    "SELECT * FROM nutrition_entries WHERE user_id = ? ORDER BY date DESC, created_at"
  ).all(userId) as NutritionEntry[];
}

export function getNutritionEntry(entryId: number): NutritionEntry | undefined {
  return getDb().prepare("SELECT * FROM nutrition_entries WHERE id = ?").get(entryId) as NutritionEntry | undefined;
}

export function updateNutritionEntry(entryId: number, updates: {
  date?: string;
  meal_type?: string;
  description?: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  notes?: string | null;
}): NutritionEntry | undefined {
  const db = getDb();
  const allowed = new Set(["date", "meal_type", "description", "calories", "protein_g", "carbs_g", "fat_g", "notes"]);

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (allowed.has(key) && val !== undefined && val !== null) {
      setClauses.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (setClauses.length === 0) {
    return getNutritionEntry(entryId);
  }

  values.push(entryId);
  db.prepare(`UPDATE nutrition_entries SET ${setClauses.join(", ")} WHERE id = ?`).run(...values);
  return getNutritionEntry(entryId);
}

export function deleteNutritionEntry(entryId: number): boolean {
  const result = getDb().prepare("DELETE FROM nutrition_entries WHERE id = ?").run(entryId);
  return result.changes > 0;
}

// ═══════════════════════════════════════════════════
// 9. CHAT HISTORY CRUD
// ═══════════════════════════════════════════════════

export function createChatEntry(params: {
  user_id: number;
  user_input: string;
  bot_response: string;
  conversation_id?: number | null;
  model_used?: string | null;
  guardrail_triggered?: boolean;
  guardrail_rule?: string | null;
  response_time_ms?: number | null;
}): ChatHistoryEntry {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO chat_history
    (user_id, conversation_id, user_input, bot_response, model_used,
     guardrail_triggered, guardrail_rule, response_time_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    params.user_id,
    params.conversation_id ?? null,
    params.user_input,
    params.bot_response,
    params.model_used ?? null,
    params.guardrail_triggered ? 1 : 0,
    params.guardrail_rule ?? null,
    params.response_time_ms ?? null,
  );
  const row = db.prepare("SELECT * FROM chat_history WHERE id = ?").get(result.lastInsertRowid) as ChatHistoryEntry;
  row.guardrail_triggered = Boolean(row.guardrail_triggered);
  return row;
}

export function listChatHistory(
  userId: number,
  conversationId?: number | null,
  limit: number = 50,
): ChatHistoryEntry[] {
  const db = getDb();
  let rows: ChatHistoryEntry[];

  if (conversationId) {
    rows = db.prepare(`
      SELECT * FROM chat_history
      WHERE user_id = ? AND conversation_id = ?
      ORDER BY created_at DESC LIMIT ?
    `).all(userId, conversationId, limit) as ChatHistoryEntry[];
  } else {
    rows = db.prepare(`
      SELECT * FROM chat_history
      WHERE user_id = ?
      ORDER BY created_at DESC LIMIT ?
    `).all(userId, limit) as ChatHistoryEntry[];
  }

  return rows.map((r) => ({ ...r, guardrail_triggered: Boolean(r.guardrail_triggered) }));
}

// ═══════════════════════════════════════════════════
// 10. CONVERSATION MEMORY CRUD
// ═══════════════════════════════════════════════════

export function createConversationMemory(params: {
  user_id: number;
  conversation_id: number;
  summary: string;
}): ConversationMemory {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO conversation_memory (user_id, conversation_id, summary)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(params.user_id, params.conversation_id, params.summary);
  return db.prepare("SELECT * FROM conversation_memory WHERE id = ?").get(result.lastInsertRowid) as ConversationMemory;
}

export function getConversationMemory(conversationId: number): ConversationMemory | undefined {
  return getDb().prepare(`
    SELECT * FROM conversation_memory
    WHERE conversation_id = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(conversationId) as ConversationMemory | undefined;
}

export function listConversationMemories(userId: number): ConversationMemory[] {
  return getDb().prepare(`
    SELECT cm.*, c.title as conversation_title
    FROM conversation_memory cm
    JOIN conversations c ON cm.conversation_id = c.id
    WHERE cm.user_id = ?
    ORDER BY cm.created_at DESC
  `).all(userId) as ConversationMemory[];
}

// ═══════════════════════════════════════════════════
// 11. PROGRESS ENTRIES CRUD
// ═══════════════════════════════════════════════════

export function createProgressEntry(params: {
  user_id: number;
  date: string;
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  bench_press_max_kg?: number | null;
  squat_max_kg?: number | null;
  deadlift_max_kg?: number | null;
  run_time_seconds?: number | null;
  push_ups?: number | null;
  notes?: string | null;
}): ProgressEntry {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO progress_entries
    (user_id, date, weight_kg, body_fat_pct, bench_press_max_kg,
     squat_max_kg, deadlift_max_kg, run_time_seconds, push_ups, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    params.user_id,
    params.date,
    params.weight_kg ?? null,
    params.body_fat_pct ?? null,
    params.bench_press_max_kg ?? null,
    params.squat_max_kg ?? null,
    params.deadlift_max_kg ?? null,
    params.run_time_seconds ?? null,
    params.push_ups ?? null,
    params.notes ?? null,
  );
  return db.prepare("SELECT * FROM progress_entries WHERE id = ?").get(result.lastInsertRowid) as ProgressEntry;
}

export function listProgressEntries(userId: number, limit: number = 30): ProgressEntry[] {
  return getDb().prepare(
    "SELECT * FROM progress_entries WHERE user_id = ? ORDER BY date DESC LIMIT ?"
  ).all(userId, limit) as ProgressEntry[];
}

export function getProgressEntry(entryId: number): ProgressEntry | undefined {
  return getDb().prepare("SELECT * FROM progress_entries WHERE id = ?").get(entryId) as ProgressEntry | undefined;
}

export function updateProgressEntry(entryId: number, updates: {
  date?: string;
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  bench_press_max_kg?: number | null;
  squat_max_kg?: number | null;
  deadlift_max_kg?: number | null;
  run_time_seconds?: number | null;
  push_ups?: number | null;
  notes?: string | null;
}): ProgressEntry | undefined {
  const db = getDb();
  const allowed = new Set([
    "date", "weight_kg", "body_fat_pct", "bench_press_max_kg",
    "squat_max_kg", "deadlift_max_kg", "run_time_seconds", "push_ups", "notes",
  ]);

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (allowed.has(key) && val !== undefined && val !== null) {
      setClauses.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (setClauses.length === 0) {
    return getProgressEntry(entryId);
  }

  values.push(entryId);
  db.prepare(`UPDATE progress_entries SET ${setClauses.join(", ")} WHERE id = ?`).run(...values);
  return getProgressEntry(entryId);
}

export function deleteProgressEntry(entryId: number): boolean {
  const result = getDb().prepare("DELETE FROM progress_entries WHERE id = ?").run(entryId);
  return result.changes > 0;
}
