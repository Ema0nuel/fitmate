"""
FitMateBOT — Pydantic data models.

Defines request/response schemas for all API endpoints.
Maps to Chapter Three Section 3.5.4 database entities.

Entities:
  1. Users — identity (no auth, local-only)
  2. Profiles — body stats, fitness level, medical flags
  3. Fitness Goals — goal type, targets, status
  4. Workout Plans — routines with day/frequency metadata
  5. Exercises — exercise catalog (form cues, muscles, equipment)
  6. Nutrition — meal entries with macronutrient breakdowns
  7. Chat History — user-agent exchanges with guardrail audit
  8. Conversation Memory — compressed dialogue summaries
  9. Progress Tracking — periodic body/performance measurements
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════
# 1. USERS — Chapter Three: "Stores login credentials
#    and identity records"
#    (No auth in MVP — identity is local only)
# ═══════════════════════════════════════════════════

class UserCreate(BaseModel):
    """Create a user during onboarding step 1."""
    name: str = Field(..., min_length=1, max_length=100, examples=["Emmanuel"])


class UserResponse(BaseModel):
    id: int
    name: str
    created_at: str | None = None


# ═══════════════════════════════════════════════════
# 2. PROFILES — Chapter Three: "Stores age, gender,
#    weight, height, fitness level, medical flags.
#    The fine-tuned model needs structured user
#    attributes as prompt context."
# ═══════════════════════════════════════════════════

class ProfileCreate(BaseModel):
    """Create a profile — called after onboarding collects body stats."""
    user_id: int
    age: int | None = Field(None, ge=10, le=120)
    gender: str | None = Field(None, pattern=r"^(male|female|other|prefer_not_to_say)$")
    weight_kg: float | None = Field(None, ge=20.0, le=500.0)
    height_cm: float | None = Field(None, ge=100.0, le=300.0)
    fitness_level: str | None = Field(
        None, pattern=r"^(beginner|intermediate|advanced)$"
    )
    medical_flags: str | None = None  # e.g. "knee injury, asthma"
    onboarding_complete: bool = False


class ProfileUpdate(BaseModel):
    """Partial update for a profile."""
    age: int | None = Field(None, ge=10, le=120)
    gender: str | None = Field(None, pattern=r"^(male|female|other|prefer_not_to_say)$")
    weight_kg: float | None = Field(None, ge=20.0, le=500.0)
    height_cm: float | None = Field(None, ge=100.0, le=300.0)
    fitness_level: str | None = Field(
        None, pattern=r"^(beginner|intermediate|advanced)$"
    )
    medical_flags: str | None = None
    onboarding_complete: bool | None = None


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    age: int | None = None
    gender: str | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    fitness_level: str | None = None
    medical_flags: str | None = None
    onboarding_complete: bool = False
    created_at: str | None = None
    updated_at: str | None = None


class OnboardingStatusResponse(BaseModel):
    """Quick check: has this user completed onboarding?"""
    has_profile: bool
    onboarding_complete: bool
    user_id: int | None = None


# ═══════════════════════════════════════════════════
# 3. FITNESS GOALS — Chapter Three: "Stores goal type
#    (weight loss, muscle gain, cardiovascular
#    improvement) and target values. Goal tracking is
#    one of the four stated objectives of this
#    research."
# ═══════════════════════════════════════════════════

class FitnessGoalCreate(BaseModel):
    user_id: int
    goal_type: str = Field(
        ...,
        max_length=50,
        description="e.g. weight_loss, muscle_gain, cardiovascular, flexibility",
    )
    target_value: float | None = Field(None, description="Numeric target")
    target_unit: str | None = Field(None, max_length=20, description="kg, lbs, reps, etc.")
    target_date: str | None = Field(None, description="YYYY-MM-DD target date")
    description: str | None = Field(None, max_length=500)
    status: str = Field("active", pattern=r"^(active|completed|abandoned)$")


class FitnessGoalUpdate(BaseModel):
    goal_type: str | None = Field(None, max_length=50)
    target_value: float | None = None
    target_unit: str | None = Field(None, max_length=20)
    target_date: str | None = None
    description: str | None = Field(None, max_length=500)
    status: str | None = Field(None, pattern=r"^(active|completed|abandoned)$")


class FitnessGoalResponse(BaseModel):
    id: int
    user_id: int
    goal_type: str
    target_value: float | None = None
    target_unit: str | None = None
    target_date: str | None = None
    description: str | None = None
    status: str = "active"
    created_at: str | None = None


# ═══════════════════════════════════════════════════
# 4. WORKOUT PLANS — Chapter Three: "Stores generated
#    or assigned routines and their constituent
#    exercises, separated so plans can be regenerated
#    or adjusted without losing history."
# ═══════════════════════════════════════════════════

class WorkoutPlanCreate(BaseModel):
    user_id: int
    name: str = Field(..., min_length=1, max_length=200, examples=["Week 1 Push Pull Legs"])
    description: str | None = Field(None, max_length=1000)
    days_per_week: int | None = Field(None, ge=1, le=7)
    duration_weeks: int | None = Field(None, ge=1, le=52)
    status: str = Field("active", pattern=r"^(active|completed|archived)$")


class WorkoutPlanUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)
    days_per_week: int | None = Field(None, ge=1, le=7)
    duration_weeks: int | None = Field(None, ge=1, le=52)
    status: str | None = Field(None, pattern=r"^(active|completed|archived)$")


class WorkoutPlanResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: str | None = None
    days_per_week: int | None = None
    duration_weeks: int | None = None
    status: str = "active"
    created_at: str | None = None
    updated_at: str | None = None


# ═══════════════════════════════════════════════════
# 5. EXERCISES — Reference catalog + plan entries.
#    Chapter Three: "Workout Plans / Exercises —
#    stores generated or assigned routines and their
#    constituent exercises"
# ═══════════════════════════════════════════════════

class ExerciseCreate(BaseModel):
    """Add an exercise to the catalog."""
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    muscle_group: str | None = Field(None, max_length=100)
    equipment: str | None = Field(None, max_length=100)
    difficulty: str | None = Field(None, pattern=r"^(beginner|intermediate|advanced)$")


class ExerciseResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    muscle_group: str | None = None
    equipment: str | None = None
    difficulty: str | None = None


class WorkoutExerciseCreate(BaseModel):
    """Add an exercise to a workout plan."""
    workout_plan_id: int
    exercise_name: str = Field(..., max_length=200)
    sets: int | None = Field(None, ge=1, le=20)
    reps: int | None = Field(None, ge=1, le=100)
    duration_seconds: int | None = Field(None, ge=1, description="For timed exercises")
    rest_seconds: int | None = Field(None, ge=0, description="Rest between sets")
    notes: str | None = Field(None, max_length=500)
    order_index: int = Field(0, description="Display order within the plan")


class WorkoutExerciseResponse(BaseModel):
    id: int
    workout_plan_id: int
    exercise_name: str
    sets: int | None = None
    reps: int | None = None
    duration_seconds: int | None = None
    rest_seconds: int | None = None
    notes: str | None = None
    order_index: int = 0


# ═══════════════════════════════════════════════════
# 6. NUTRITION — Chapter Three: "Stores meal entries
#    and macronutrient breakdowns, letting the agent
#    reason over dietary history."
# ═══════════════════════════════════════════════════

class NutritionEntryCreate(BaseModel):
    user_id: int
    date: str = Field(..., description="YYYY-MM-DD")
    meal_type: str = Field(
        ..., max_length=20, description="breakfast, lunch, dinner, snack"
    )
    description: str = Field(..., max_length=500, examples=["Grilled chicken salad"])
    calories: float | None = Field(None, ge=0)
    protein_g: float | None = Field(None, ge=0)
    carbs_g: float | None = Field(None, ge=0)
    fat_g: float | None = Field(None, ge=0)
    notes: str | None = Field(None, max_length=500)


class NutritionEntryUpdate(BaseModel):
    date: str | None = None
    meal_type: str | None = Field(None, max_length=20)
    description: str | None = Field(None, max_length=500)
    calories: float | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    notes: str | None = Field(None, max_length=500)


class NutritionEntryResponse(BaseModel):
    id: int
    user_id: int
    date: str
    meal_type: str
    description: str
    calories: float | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    notes: str | None = None
    created_at: str | None = None


# ═══════════════════════════════════════════════════
# 7. CHAT HISTORY — Chapter Three: "Stores every
#    user-agent exchange with timestamps, forming
#    the audit trail required for guardrail
#    accountability."
# ═══════════════════════════════════════════════════

class ChatHistoryEntry(BaseModel):
    """A single stored exchange (user input + bot response)."""
    id: int
    user_id: int
    conversation_id: int | None = None
    user_input: str
    bot_response: str
    model_used: str | None = None
    guardrail_triggered: bool = False
    guardrail_rule: str | None = None
    response_time_ms: int | None = None
    created_at: str | None = None


# ═══════════════════════════════════════════════════
# 8. CONVERSATION MEMORY — Chapter Three: "Stores a
#    compressed running summary of the dialogue,
#    keeping the LLM's context window efficient
#    while preserving continuity across sessions."
# ═══════════════════════════════════════════════════

class ConversationMemoryResponse(BaseModel):
    id: int
    user_id: int
    conversation_id: int
    summary: str
    created_at: str | None = None


# ═══════════════════════════════════════════════════
# 9. PROGRESS TRACKING — Chapter Three: "Stores
#    periodic measurements (weight, endurance test
#    results, etc.), converting qualitative
#    encouragement into quantitative evidence."
# ═══════════════════════════════════════════════════

class ProgressEntryCreate(BaseModel):
    user_id: int
    date: str = Field(..., description="YYYY-MM-DD")
    weight_kg: float | None = Field(None, ge=0)
    body_fat_pct: float | None = Field(None, ge=0, le=100)
    bench_press_max_kg: float | None = Field(None, ge=0)
    squat_max_kg: float | None = Field(None, ge=0)
    deadlift_max_kg: float | None = Field(None, ge=0)
    run_time_seconds: int | None = Field(None, ge=0, description="5k run in seconds")
    push_ups: int | None = Field(None, ge=0)
    notes: str | None = Field(None, max_length=500)


class ProgressEntryUpdate(BaseModel):
    date: str | None = None
    weight_kg: float | None = None
    body_fat_pct: float | None = None
    bench_press_max_kg: float | None = None
    squat_max_kg: float | None = None
    deadlift_max_kg: float | None = None
    run_time_seconds: int | None = None
    push_ups: int | None = None
    notes: str | None = Field(None, max_length=500)


class ProgressEntryResponse(BaseModel):
    id: int
    user_id: int
    date: str
    weight_kg: float | None = None
    body_fat_pct: float | None = None
    bench_press_max_kg: float | None = None
    squat_max_kg: float | None = None
    deadlift_max_kg: float | None = None
    run_time_seconds: int | None = None
    push_ups: int | None = None
    notes: str | None = None
    created_at: str | None = None


# ═══════════════════════════════════════════════════
# CHAT — Request / Response for the chat endpoint
# ═══════════════════════════════════════════════════

class ChatRequest(BaseModel):
    """Send a message to FitMate."""
    user_id: int
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: int | None = Field(
        None, description="If None, a new conversation is created"
    )


class ChatResponse(BaseModel):
    """FitMate's reply."""
    response: str
    conversation_id: int
    guardrail_triggered: bool = False
    guardrail_rule: str | None = None
    model_used: str | None = None


# ═══════════════════════════════════════════════════
# CONVERSATIONS — lightweight wrapper for grouping
# chat_history entries (supports multi-turn)
# ═══════════════════════════════════════════════════

class ConversationResponse(BaseModel):
    id: int
    user_id: int
    title: str | None = None
    created_at: str | None = None
