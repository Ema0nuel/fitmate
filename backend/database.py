"""
FitMateBOT — SQLite database layer.

Handles connection management, table creation, and CRUD operations
for all Chapter Three Section 3.5.4 entities:
  1. users
  2. profiles
  3. fitness_goals
  4. conversations
  5. workout_plans
  6. workout_exercises
  7. nutrition_entries
  8. chat_history
  9. conversation_memory
  10. progress_entries
  11. exercises (reference catalog)

Uses aiosqlite for async compatibility with FastAPI.
"""

from __future__ import annotations

import json
import os
from datetime import datetime

import aiosqlite

DATABASE_PATH = os.getenv("DATABASE_PATH", "./fitmate.db")


# ──────────────────────────────────────────────────
# Connection helper
# ──────────────────────────────────────────────────

async def get_db() -> aiosqlite.Connection:
    """Get a database connection with row factory enabled."""
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    return db


# ──────────────────────────────────────────────────
# Table creation — all Chapter Three entities
# ──────────────────────────────────────────────────

async def init_db():
    """Create all tables if they don't exist. Called on app startup."""
    db = await get_db()
    try:
        # 1. USERS — identity records
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 2. PROFILES — body stats, fitness level, medical flags
        await db.execute("""
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
        """)

        # 3. FITNESS GOALS — Chapter Three entity
        await db.execute("""
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
        """)

        # 4. CONVERSATIONS — groups chat messages into sessions
        await db.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # 5. WORKOUT PLANS — routines
        await db.execute("""
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
        """)

        # 6. WORKOUT EXERCISES — exercises within a plan
        await db.execute("""
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
        """)

        # 7. NUTRITION ENTRIES — Chapter Three: meal entries + macros
        await db.execute("""
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
        """)

        # 8. CHAT HISTORY — every user-agent exchange with guardrail audit
        await db.execute("""
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
        """)

        # 9. CONVERSATION MEMORY — compressed dialogue summaries
        await db.execute("""
            CREATE TABLE IF NOT EXISTS conversation_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                conversation_id INTEGER NOT NULL,
                summary TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            )
        """)

        # 10. PROGRESS ENTRIES — Chapter Three: periodic measurements
        await db.execute("""
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
        """)

        # 11. EXERCISES — reference catalog for exercise library
        await db.execute("""
            CREATE TABLE IF NOT EXISTS exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                muscle_group TEXT,
                equipment TEXT,
                difficulty TEXT CHECK(difficulty IN ('beginner', 'intermediate', 'advanced'))
            )
        """)

        await db.commit()
    finally:
        await db.close()


# ═══════════════════════════════════════════════════
# 1. USERS CRUD
# ═══════════════════════════════════════════════════

async def create_user(name: str) -> dict:
    """Create a new user. Returns the created user as a dict."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO users (name) VALUES (?)", (name,)
        )
        await db.commit()
        row = await db.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,))
        user = await row.fetchone()
        return dict(user)
    finally:
        await db.close()


async def get_user(user_id: int) -> dict | None:
    """Fetch a user by ID."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def list_users() -> list[dict]:
    """List all users (for debugging / thesis demo)."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users ORDER BY id")
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


# ═══════════════════════════════════════════════════
# 2. PROFILES CRUD
# ═══════════════════════════════════════════════════

async def create_profile(
    user_id: int,
    age: int | None = None,
    gender: str | None = None,
    weight_kg: float | None = None,
    height_cm: float | None = None,
    fitness_level: str | None = None,
    medical_flags: str | None = None,
    onboarding_complete: bool = False,
) -> dict:
    """Create a profile for a user. One profile per user."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO profiles
               (user_id, age, gender, weight_kg, height_cm, fitness_level, medical_flags, onboarding_complete)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, age, gender, weight_kg, height_cm, fitness_level, medical_flags, int(onboarding_complete)),
        )
        await db.commit()
        row = await db.execute("SELECT * FROM profiles WHERE id = ?", (cursor.lastrowid,))
        profile = await row.fetchone()
        return dict(profile)
    finally:
        await db.close()


async def get_profile(user_id: int) -> dict | None:
    """Fetch a profile by user_id."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
        row = await cursor.fetchone()
        if row:
            result = dict(row)
            result["onboarding_complete"] = bool(result.get("onboarding_complete", 0))
            return result
        return None
    finally:
        await db.close()


async def update_profile(user_id: int, **kwargs) -> dict | None:
    """Partial update of profile fields."""
    db = await get_db()
    try:
        allowed = {
            "age", "gender", "weight_kg", "height_cm",
            "fitness_level", "medical_flags", "onboarding_complete",
        }
        updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        if not updates:
            return await get_profile(user_id)

        if "onboarding_complete" in updates:
            updates["onboarding_complete"] = int(updates["onboarding_complete"])

        updates["updated_at"] = datetime.utcnow().isoformat()

        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [user_id]
        await db.execute(f"UPDATE profiles SET {set_clause} WHERE user_id = ?", values)
        await db.commit()
        return await get_profile(user_id)
    finally:
        await db.close()


async def get_profile_by_id(profile_id: int) -> dict | None:
    """Fetch a profile by its own ID (not user_id)."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM profiles WHERE id = ?", (profile_id,))
        row = await cursor.fetchone()
        if row:
            result = dict(row)
            result["onboarding_complete"] = bool(result.get("onboarding_complete", 0))
            return result
        return None
    finally:
        await db.close()


# ═══════════════════════════════════════════════════
# 3. FITNESS GOALS CRUD
# ═══════════════════════════════════════════════════

async def create_fitness_goal(
    user_id: int,
    goal_type: str,
    target_value: float | None = None,
    target_unit: str | None = None,
    target_date: str | None = None,
    description: str | None = None,
    status: str = "active",
) -> dict:
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO fitness_goals
               (user_id, goal_type, target_value, target_unit, target_date, description, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, goal_type, target_value, target_unit, target_date, description, status),
        )
        await db.commit()
        row = await db.execute("SELECT * FROM fitness_goals WHERE id = ?", (cursor.lastrowid,))
        goal = await row.fetchone()
        return dict(goal)
    finally:
        await db.close()


async def get_fitness_goals(user_id: int, status: str | None = None) -> list[dict]:
    """List goals for a user, optionally filtered by status."""
    db = await get_db()
    try:
        if status:
            cursor = await db.execute(
                "SELECT * FROM fitness_goals WHERE user_id = ? AND status = ? ORDER BY created_at DESC",
                (user_id, status),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM fitness_goals WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


async def get_fitness_goal(goal_id: int) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM fitness_goals WHERE id = ?", (goal_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def update_fitness_goal(goal_id: int, **kwargs) -> dict | None:
    db = await get_db()
    try:
        allowed = {"goal_type", "target_value", "target_unit", "target_date", "description", "status"}
        updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        if not updates:
            return await get_fitness_goal(goal_id)

        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [goal_id]
        await db.execute(f"UPDATE fitness_goals SET {set_clause} WHERE id = ?", values)
        await db.commit()
        return await get_fitness_goal(goal_id)
    finally:
        await db.close()


async def delete_fitness_goal(goal_id: int) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM fitness_goals WHERE id = ?", (goal_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


# ═══════════════════════════════════════════════════
# 4. CONVERSATIONS CRUD
# ═══════════════════════════════════════════════════

async def create_conversation(user_id: int, title: str | None = None) -> dict:
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO conversations (user_id, title) VALUES (?, ?)",
            (user_id, title),
        )
        await db.commit()
        row = await db.execute("SELECT * FROM conversations WHERE id = ?", (cursor.lastrowid,))
        conv = await row.fetchone()
        return dict(conv)
    finally:
        await db.close()


async def get_conversation(conversation_id: int) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM conversations WHERE id = ?", (conversation_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def list_conversations(user_id: int) -> list[dict]:
    """List all conversations for a user, newest first."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


async def update_conversation_title(conversation_id: int, title: str) -> dict | None:
    db = await get_db()
    try:
        await db.execute(
            "UPDATE conversations SET title = ? WHERE id = ?", (title, conversation_id)
        )
        await db.commit()
        return await get_conversation(conversation_id)
    finally:
        await db.close()


# ═══════════════════════════════════════════════════
# 5. WORKOUT PLANS CRUD
# ═══════════════════════════════════════════════════

async def create_workout_plan(
    user_id: int,
    name: str,
    description: str | None = None,
    days_per_week: int | None = None,
    duration_weeks: int | None = None,
    status: str = "active",
) -> dict:
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO workout_plans
               (user_id, name, description, days_per_week, duration_weeks, status)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, name, description, days_per_week, duration_weeks, status),
        )
        await db.commit()
        row = await db.execute("SELECT * FROM workout_plans WHERE id = ?", (cursor.lastrowid,))
        plan = await row.fetchone()
        return dict(plan)
    finally:
        await db.close()


async def get_workout_plan(plan_id: int) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM workout_plans WHERE id = ?", (plan_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def list_workout_plans(user_id: int, status: str | None = None) -> list[dict]:
    db = await get_db()
    try:
        if status:
            cursor = await db.execute(
                "SELECT * FROM workout_plans WHERE user_id = ? AND status = ? ORDER BY created_at DESC",
                (user_id, status),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM workout_plans WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


async def update_workout_plan(plan_id: int, **kwargs) -> dict | None:
    db = await get_db()
    try:
        allowed = {"name", "description", "days_per_week", "duration_weeks", "status"}
        updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        if not updates:
            return await get_workout_plan(plan_id)

        updates["updated_at"] = datetime.utcnow().isoformat()

        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [plan_id]
        await db.execute(f"UPDATE workout_plans SET {set_clause} WHERE id = ?", values)
        await db.commit()
        return await get_workout_plan(plan_id)
    finally:
        await db.close()


async def delete_workout_plan(plan_id: int) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM workout_plans WHERE id = ?", (plan_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


# ═══════════════════════════════════════════════════
# 6. WORKOUT EXERCISES CRUD
# ═══════════════════════════════════════════════════

async def create_workout_exercise(
    workout_plan_id: int,
    exercise_name: str,
    sets: int | None = None,
    reps: int | None = None,
    duration_seconds: int | None = None,
    rest_seconds: int | None = None,
    notes: str | None = None,
    order_index: int = 0,
) -> dict:
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO workout_exercises
               (workout_plan_id, exercise_name, sets, reps, duration_seconds, rest_seconds, notes, order_index)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (workout_plan_id, exercise_name, sets, reps, duration_seconds, rest_seconds, notes, order_index),
        )
        await db.commit()
        row = await db.execute("SELECT * FROM workout_exercises WHERE id = ?", (cursor.lastrowid,))
        ex = await row.fetchone()
        return dict(ex)
    finally:
        await db.close()


async def list_workout_exercises(workout_plan_id: int) -> list[dict]:
    """List exercises in a plan, ordered by order_index."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM workout_exercises WHERE workout_plan_id = ? ORDER BY order_index",
            (workout_plan_id,),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


async def delete_workout_exercise(exercise_id: int) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM workout_exercises WHERE id = ?", (exercise_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


# ═══════════════════════════════════════════════════
# 7. EXERCISES (catalog) CRUD
# ═══════════════════════════════════════════════════

async def create_exercise(
    name: str,
    description: str | None = None,
    muscle_group: str | None = None,
    equipment: str | None = None,
    difficulty: str | None = None,
) -> dict:
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO exercises (name, description, muscle_group, equipment, difficulty)
               VALUES (?, ?, ?, ?, ?)""",
            (name, description, muscle_group, equipment, difficulty),
        )
        await db.commit()
        row = await db.execute("SELECT * FROM exercises WHERE id = ?", (cursor.lastrowid,))
        ex = await row.fetchone()
        return dict(ex)
    finally:
        await db.close()


async def list_exercises(muscle_group: str | None = None) -> list[dict]:
    db = await get_db()
    try:
        if muscle_group:
            cursor = await db.execute(
                "SELECT * FROM exercises WHERE muscle_group = ? ORDER BY name", (muscle_group,)
            )
        else:
            cursor = await db.execute("SELECT * FROM exercises ORDER BY name")
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


async def search_exercises(query: str) -> list[dict]:
    """Search exercises by name (case-insensitive)."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM exercises WHERE name LIKE ? ORDER BY name",
            (f"%{query}%",),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


# ═══════════════════════════════════════════════════
# 8. NUTRITION ENTRIES CRUD
# ═══════════════════════════════════════════════════

async def create_nutrition_entry(
    user_id: int,
    date: str,
    meal_type: str,
    description: str,
    calories: float | None = None,
    protein_g: float | None = None,
    carbs_g: float | None = None,
    fat_g: float | None = None,
    notes: str | None = None,
) -> dict:
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO nutrition_entries
               (user_id, date, meal_type, description, calories, protein_g, carbs_g, fat_g, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, date, meal_type, description, calories, protein_g, carbs_g, fat_g, notes),
        )
        await db.commit()
        row = await db.execute("SELECT * FROM nutrition_entries WHERE id = ?", (cursor.lastrowid,))
        entry = await row.fetchone()
        return dict(entry)
    finally:
        await db.close()


async def list_nutrition_entries(user_id: int, date: str | None = None) -> list[dict]:
    """List nutrition entries for a user, optionally filtered by date."""
    db = await get_db()
    try:
        if date:
            cursor = await db.execute(
                "SELECT * FROM nutrition_entries WHERE user_id = ? AND date = ? ORDER BY created_at",
                (user_id, date),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM nutrition_entries WHERE user_id = ? ORDER BY date DESC, created_at",
                (user_id,),
            )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


async def get_nutrition_entry(entry_id: int) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM nutrition_entries WHERE id = ?", (entry_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def update_nutrition_entry(entry_id: int, **kwargs) -> dict | None:
    db = await get_db()
    try:
        allowed = {"date", "meal_type", "description", "calories", "protein_g", "carbs_g", "fat_g", "notes"}
        updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        if not updates:
            return await get_nutrition_entry(entry_id)

        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [entry_id]
        await db.execute(f"UPDATE nutrition_entries SET {set_clause} WHERE id = ?", values)
        await db.commit()
        return await get_nutrition_entry(entry_id)
    finally:
        await db.close()


async def delete_nutrition_entry(entry_id: int) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM nutrition_entries WHERE id = ?", (entry_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


# ═══════════════════════════════════════════════════
# 9. CHAT HISTORY CRUD
# ═══════════════════════════════════════════════════

async def create_chat_entry(
    user_id: int,
    user_input: str,
    bot_response: str,
    conversation_id: int | None = None,
    model_used: str | None = None,
    guardrail_triggered: bool = False,
    guardrail_rule: str | None = None,
    response_time_ms: int | None = None,
) -> dict:
    """Store a complete user-agent exchange."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO chat_history
               (user_id, conversation_id, user_input, bot_response, model_used,
                guardrail_triggered, guardrail_rule, response_time_ms)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, conversation_id, user_input, bot_response, model_used,
             int(guardrail_triggered), guardrail_rule, response_time_ms),
        )
        await db.commit()
        row = await db.execute("SELECT * FROM chat_history WHERE id = ?", (cursor.lastrowid,))
        entry = await row.fetchone()
        result = dict(entry)
        result["guardrail_triggered"] = bool(result.get("guardrail_triggered", 0))
        return result
    finally:
        await db.close()


async def list_chat_history(
    user_id: int,
    conversation_id: int | None = None,
    limit: int = 50,
) -> list[dict]:
    """List chat history entries, newest first."""
    db = await get_db()
    try:
        if conversation_id:
            cursor = await db.execute(
                """SELECT * FROM chat_history
                   WHERE user_id = ? AND conversation_id = ?
                   ORDER BY created_at DESC LIMIT ?""",
                (user_id, conversation_id, limit),
            )
        else:
            cursor = await db.execute(
                """SELECT * FROM chat_history
                   WHERE user_id = ?
                   ORDER BY created_at DESC LIMIT ?""",
                (user_id, limit),
            )
        rows = await cursor.fetchall()
        results = []
        for r in rows:
            d = dict(r)
            d["guardrail_triggered"] = bool(d.get("guardrail_triggered", 0))
            results.append(d)
        return results
    finally:
        await db.close()


# ═══════════════════════════════════════════════════
# 10. CONVERSATION MEMORY CRUD
# ═══════════════════════════════════════════════════

async def create_conversation_memory(
    user_id: int,
    conversation_id: int,
    summary: str,
) -> dict:
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO conversation_memory (user_id, conversation_id, summary)
               VALUES (?, ?, ?)""",
            (user_id, conversation_id, summary),
        )
        await db.commit()
        row = await db.execute(
            "SELECT * FROM conversation_memory WHERE id = ?", (cursor.lastrowid,)
        )
        mem = await row.fetchone()
        return dict(mem)
    finally:
        await db.close()


async def get_conversation_memory(conversation_id: int) -> dict | None:
    """Get the latest memory summary for a conversation."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT * FROM conversation_memory
               WHERE conversation_id = ?
               ORDER BY created_at DESC LIMIT 1""",
            (conversation_id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def list_conversation_memories(user_id: int) -> list[dict]:
    """List all memory summaries for a user (for context assembly)."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT cm.*, c.title as conversation_title
               FROM conversation_memory cm
               JOIN conversations c ON cm.conversation_id = c.id
               WHERE cm.user_id = ?
               ORDER BY cm.created_at DESC""",
            (user_id,),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


# ═══════════════════════════════════════════════════
# 11. PROGRESS ENTRIES CRUD
# ═══════════════════════════════════════════════════

async def create_progress_entry(
    user_id: int,
    date: str,
    weight_kg: float | None = None,
    body_fat_pct: float | None = None,
    bench_press_max_kg: float | None = None,
    squat_max_kg: float | None = None,
    deadlift_max_kg: float | None = None,
    run_time_seconds: int | None = None,
    push_ups: int | None = None,
    notes: str | None = None,
) -> dict:
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO progress_entries
               (user_id, date, weight_kg, body_fat_pct, bench_press_max_kg,
                squat_max_kg, deadlift_max_kg, run_time_seconds, push_ups, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, date, weight_kg, body_fat_pct, bench_press_max_kg,
             squat_max_kg, deadlift_max_kg, run_time_seconds, push_ups, notes),
        )
        await db.commit()
        row = await db.execute("SELECT * FROM progress_entries WHERE id = ?", (cursor.lastrowid,))
        entry = await row.fetchone()
        return dict(entry)
    finally:
        await db.close()


async def list_progress_entries(user_id: int, limit: int = 30) -> list[dict]:
    """List progress entries, newest first."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM progress_entries WHERE user_id = ? ORDER BY date DESC LIMIT ?",
            (user_id, limit),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


async def get_progress_entry(entry_id: int) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM progress_entries WHERE id = ?", (entry_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def update_progress_entry(entry_id: int, **kwargs) -> dict | None:
    db = await get_db()
    try:
        allowed = {
            "date", "weight_kg", "body_fat_pct", "bench_press_max_kg",
            "squat_max_kg", "deadlift_max_kg", "run_time_seconds", "push_ups", "notes",
        }
        updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        if not updates:
            return await get_progress_entry(entry_id)

        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [entry_id]
        await db.execute(f"UPDATE progress_entries SET {set_clause} WHERE id = ?", values)
        await db.commit()
        return await get_progress_entry(entry_id)
    finally:
        await db.close()


async def delete_progress_entry(entry_id: int) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM progress_entries WHERE id = ?", (entry_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()
