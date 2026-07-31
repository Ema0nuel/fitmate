"""
FitMateBOT — FastAPI Backend

Main entry point. Provides all API endpoints mapped to
Chapter Three Section 3.5.4 database entities.

The backend runs on http://localhost:8000 and communicates with
the Next.js frontend on http://localhost:3000 via REST API.

Entities served:
  1. Users — identity (no auth, local-only)
  2. Profiles — body stats, fitness level, medical flags
  3. Fitness Goals — goal tracking
  4. Conversations — chat session grouping
  5. Chat — send messages, get AI responses
  6. Workout Plans — routines with exercises
  7. Exercises — reference catalog
  8. Nutrition — meal logging with macros
  9. Progress — body/performance measurements
  10. Conversation Memory — compressed dialogue summaries
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import database as db
from chat import process_chat_message
from models import (
    # Users
    UserCreate,
    UserResponse,
    # Profiles
    ProfileCreate,
    ProfileUpdate,
    ProfileResponse,
    OnboardingStatusResponse,
    # Fitness Goals
    FitnessGoalCreate,
    FitnessGoalUpdate,
    FitnessGoalResponse,
    # Conversations
    ConversationResponse,
    # Chat
    ChatRequest,
    ChatResponse,
    # Workout Plans
    WorkoutPlanCreate,
    WorkoutPlanUpdate,
    WorkoutPlanResponse,
    # Workout Exercises
    WorkoutExerciseCreate,
    WorkoutExerciseResponse,
    # Exercises (catalog)
    ExerciseCreate,
    ExerciseResponse,
    # Nutrition
    NutritionEntryCreate,
    NutritionEntryUpdate,
    NutritionEntryResponse,
    # Progress
    ProgressEntryCreate,
    ProgressEntryUpdate,
    ProgressEntryResponse,
    # Conversation Memory
    ConversationMemoryResponse,
    # Chat History
    ChatHistoryEntry,
)

# Load .env from backend directory
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup."""
    await db.init_db()
    yield


app = FastAPI(
    title="FitMateBOT API",
    description=(
        "Backend API for FitMate fitness chatbot. "
        "Maps to Chapter Three Section 3.5.4 database entities."
    ),
    version="0.2.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════
# Health Check
# ═══════════════════════════════════════════════════

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "FitMateBOT API", "version": "0.2.0"}


# ═══════════════════════════════════════════════════
# 1. USERS
# ═══════════════════════════════════════════════════

@app.post("/api/users", response_model=UserResponse, status_code=201)
async def create_user(profile: UserCreate):
    """Create a new user. Called during onboarding step 1."""
    user = await db.create_user(name=profile.name)
    return UserResponse(**user)


@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    user = await db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)


@app.get("/api/users", response_model=list[UserResponse])
async def list_users():
    """List all users (debug / thesis demo)."""
    users = await db.list_users()
    return [UserResponse(**u) for u in users]


# ═══════════════════════════════════════════════════
# 2. PROFILES
# ═══════════════════════════════════════════════════

@app.post("/api/profiles", response_model=ProfileResponse, status_code=201)
async def create_profile(profile: ProfileCreate):
    """Create a profile. Called when onboarding is completed."""
    # Verify user exists
    user = await db.get_user(profile.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if profile already exists
    existing = await db.get_profile(profile.user_id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Profile already exists. Use PUT to update.",
        )

    p = await db.create_profile(
        user_id=profile.user_id,
        age=profile.age,
        gender=profile.gender,
        weight_kg=profile.weight_kg,
        height_cm=profile.height_cm,
        fitness_level=profile.fitness_level,
        medical_flags=profile.medical_flags,
        onboarding_complete=profile.onboarding_complete,
    )
    return ProfileResponse(**p)


@app.get("/api/profiles/{user_id}", response_model=ProfileResponse)
async def get_profile(user_id: int):
    profile = await db.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse(**profile)


@app.put("/api/profiles/{user_id}", response_model=ProfileResponse)
async def update_profile(user_id: int, profile: ProfileUpdate):
    existing = await db.get_profile(user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = profile.model_dump(exclude_unset=True)
    updated = await db.update_profile(user_id, **update_data)
    return ProfileResponse(**updated) # pyright: ignore[reportCallIssue]


@app.get("/api/onboarding/status")
async def onboarding_status(user_id: int | None = None):
    """Check if onboarding is complete. If user_id provided, checks that user."""
    if user_id:
        profile = await db.get_profile(user_id)
        if profile:
            return OnboardingStatusResponse(
                has_profile=True,
                onboarding_complete=profile.get("onboarding_complete", False),
                user_id=user_id,
            )
    return OnboardingStatusResponse(has_profile=False, onboarding_complete=False)


# ═══════════════════════════════════════════════════
# 3. FITNESS GOALS
# ═══════════════════════════════════════════════════

@app.post("/api/goals", response_model=FitnessGoalResponse, status_code=201)
async def create_goal(goal: FitnessGoalCreate):
    user = await db.get_user(goal.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    g = await db.create_fitness_goal(
        user_id=goal.user_id,
        goal_type=goal.goal_type,
        target_value=goal.target_value,
        target_unit=goal.target_unit,
        target_date=goal.target_date,
        description=goal.description,
        status=goal.status,
    )
    return FitnessGoalResponse(**g)


@app.get("/api/goals/{user_id}", response_model=list[FitnessGoalResponse])
async def list_goals(user_id: int, status: str | None = None):
    goals = await db.get_fitness_goals(user_id, status=status)
    return [FitnessGoalResponse(**g) for g in goals]


@app.put("/api/goals/{goal_id}", response_model=FitnessGoalResponse)
async def update_goal(goal_id: int, goal: FitnessGoalUpdate):
    existing = await db.get_fitness_goal(goal_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Goal not found")

    update_data = goal.model_dump(exclude_unset=True)
    updated = await db.update_fitness_goal(goal_id, **update_data)
    return FitnessGoalResponse(**updated) # pyright: ignore[reportCallIssue]


@app.delete("/api/goals/{goal_id}")
async def delete_goal(goal_id: int):
    deleted = await db.delete_fitness_goal(goal_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"detail": "Goal deleted"}


# ═══════════════════════════════════════════════════
# 4. CONVERSATIONS
# ═══════════════════════════════════════════════════

@app.post("/api/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(user_id: int, title: str | None = None):
    conv = await db.create_conversation(user_id=user_id, title=title)
    return ConversationResponse(**conv)


@app.get("/api/conversations/{user_id}", response_model=list[ConversationResponse])
async def list_conversations(user_id: int):
    convs = await db.list_conversations(user_id)
    return [ConversationResponse(**c) for c in convs]


@app.get("/api/conversations/{user_id}/chat-history", response_model=list[ChatHistoryEntry])
async def get_chat_history(user_id: int, conversation_id: int | None = None, limit: int = 50):
    entries = await db.list_chat_history(user_id, conversation_id=conversation_id, limit=limit)
    return [ChatHistoryEntry(**e) for e in entries]


# ═══════════════════════════════════════════════════
# 5. CHAT — Core interaction
# Chapter Three Section 3.5.2 flowchart
# ═══════════════════════════════════════════════════

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message to FitMate and receive an AI response.

    Pipeline (Chapter Three Section 3.5.2):
      1. Validate user
      2. Input guardrail check
      3. Retrieve profile + conversation history
      4. Build prompt
      5. Call LLM (OpenCode-Zen / DeepSeek-V4-Flash)
      6. Output guardrail check
      7. Save exchange
      8. Return response
    """
    result = await process_chat_message(
        user_id=request.user_id,
        message=request.message,
        conversation_id=request.conversation_id,
    )

    if result.get("error") == "user_not_found":
        raise HTTPException(status_code=404, detail="User not found. Complete onboarding first.")

    return ChatResponse(
        response=result["response"],
        conversation_id=result["conversation_id"],
        guardrail_triggered=result["guardrail_triggered"],
        guardrail_rule=result["guardrail_rule"],
        model_used=result["model_used"],
    )


# ═══════════════════════════════════════════════════
# 6. WORKOUT PLANS
# ═══════════════════════════════════════════════════

@app.post("/api/workout-plans", response_model=WorkoutPlanResponse, status_code=201)
async def create_workout_plan(plan: WorkoutPlanCreate):
    user = await db.get_user(plan.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    p = await db.create_workout_plan(
        user_id=plan.user_id,
        name=plan.name,
        description=plan.description,
        days_per_week=plan.days_per_week,
        duration_weeks=plan.duration_weeks,
        status=plan.status,
    )
    return WorkoutPlanResponse(**p)


@app.get("/api/workout-plans/{user_id}", response_model=list[WorkoutPlanResponse])
async def list_workout_plans(user_id: int, status: str | None = None):
    plans = await db.list_workout_plans(user_id, status=status)
    return [WorkoutPlanResponse(**p) for p in plans]


@app.get("/api/workout-plans/detail/{plan_id}", response_model=WorkoutPlanResponse)
async def get_workout_plan(plan_id: int):
    plan = await db.get_workout_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    return WorkoutPlanResponse(**plan)


@app.put("/api/workout-plans/{plan_id}", response_model=WorkoutPlanResponse)
async def update_workout_plan(plan_id: int, plan: WorkoutPlanUpdate):
    existing = await db.get_workout_plan(plan_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Workout plan not found")

    update_data = plan.model_dump(exclude_unset=True)
    updated = await db.update_workout_plan(plan_id, **update_data)
    return WorkoutPlanResponse(**updated) # pyright: ignore[reportCallIssue]


@app.delete("/api/workout-plans/{plan_id}")
async def delete_workout_plan(plan_id: int):
    deleted = await db.delete_workout_plan(plan_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    return {"detail": "Workout plan deleted"}


# ── Exercises within a plan ──

@app.post(
    "/api/workout-plans/{plan_id}/exercises",
    response_model=WorkoutExerciseResponse,
    status_code=201,
)
async def add_exercise_to_plan(plan_id: int, exercise: WorkoutExerciseCreate):
    plan = await db.get_workout_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")

    ex = await db.create_workout_exercise(
        workout_plan_id=plan_id,
        exercise_name=exercise.exercise_name,
        sets=exercise.sets,
        reps=exercise.reps,
        duration_seconds=exercise.duration_seconds,
        rest_seconds=exercise.rest_seconds,
        notes=exercise.notes,
        order_index=exercise.order_index,
    )
    return WorkoutExerciseResponse(**ex)


@app.get(
    "/api/workout-plans/{plan_id}/exercises",
    response_model=list[WorkoutExerciseResponse],
)
async def list_exercises_in_plan(plan_id: int):
    exercises = await db.list_workout_exercises(plan_id)
    return [WorkoutExerciseResponse(**e) for e in exercises]


@app.delete("/api/workout-exercises/{exercise_id}")
async def remove_exercise_from_plan(exercise_id: int):
    deleted = await db.delete_workout_exercise(exercise_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return {"detail": "Exercise removed from plan"}


# ═══════════════════════════════════════════════════
# 7. EXERCISES (catalog)
# ═══════════════════════════════════════════════════

@app.post("/api/exercises", response_model=ExerciseResponse, status_code=201)
async def create_exercise(exercise: ExerciseCreate):
    ex = await db.create_exercise(
        name=exercise.name,
        description=exercise.description,
        muscle_group=exercise.muscle_group,
        equipment=exercise.equipment,
        difficulty=exercise.difficulty,
    )
    return ExerciseResponse(**ex)


@app.get("/api/exercises", response_model=list[ExerciseResponse])
async def list_exercises(muscle_group: str | None = None, q: str | None = None):
    """List or search exercises. Supports muscle_group filter and search query."""
    if q:
        exercises = await db.search_exercises(q)
    else:
        exercises = await db.list_exercises(muscle_group=muscle_group)
    return [ExerciseResponse(**e) for e in exercises]


# ═══════════════════════════════════════════════════
# 8. NUTRITION
# Chapter Three: "Stores meal entries and macronutrient
# breakdowns, letting the agent reason over dietary history"
# ═══════════════════════════════════════════════════

@app.post("/api/nutrition", response_model=NutritionEntryResponse, status_code=201)
async def create_nutrition_entry(entry: NutritionEntryCreate):
    user = await db.get_user(entry.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    e = await db.create_nutrition_entry(
        user_id=entry.user_id,
        date=entry.date,
        meal_type=entry.meal_type,
        description=entry.description,
        calories=entry.calories,
        protein_g=entry.protein_g,
        carbs_g=entry.carbs_g,
        fat_g=entry.fat_g,
        notes=entry.notes,
    )
    return NutritionEntryResponse(**e)


@app.get("/api/nutrition/{user_id}", response_model=list[NutritionEntryResponse])
async def list_nutrition_entries(user_id: int, date: str | None = None):
    entries = await db.list_nutrition_entries(user_id, date=date)
    return [NutritionEntryResponse(**e) for e in entries]


@app.put("/api/nutrition/{entry_id}", response_model=NutritionEntryResponse)
async def update_nutrition_entry(entry_id: int, entry: NutritionEntryUpdate):
    existing = await db.get_nutrition_entry(entry_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Nutrition entry not found")

    update_data = entry.model_dump(exclude_unset=True)
    updated = await db.update_nutrition_entry(entry_id, **update_data)
    return NutritionEntryResponse(**updated) # pyright: ignore[reportCallIssue]


@app.delete("/api/nutrition/{entry_id}")
async def delete_nutrition_entry(entry_id: int):
    deleted = await db.delete_nutrition_entry(entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Nutrition entry not found")
    return {"detail": "Nutrition entry deleted"}


# ═══════════════════════════════════════════════════
# 9. PROGRESS TRACKING
# Chapter Three: "Stores periodic measurements (weight,
# endurance test results, etc.), converting qualitative
# encouragement into quantitative evidence"
# ═══════════════════════════════════════════════════

@app.post("/api/progress", response_model=ProgressEntryResponse, status_code=201)
async def create_progress_entry(entry: ProgressEntryCreate):
    user = await db.get_user(entry.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    e = await db.create_progress_entry(
        user_id=entry.user_id,
        date=entry.date,
        weight_kg=entry.weight_kg,
        body_fat_pct=entry.body_fat_pct,
        bench_press_max_kg=entry.bench_press_max_kg,
        squat_max_kg=entry.squat_max_kg,
        deadlift_max_kg=entry.deadlift_max_kg,
        run_time_seconds=entry.run_time_seconds,
        push_ups=entry.push_ups,
        notes=entry.notes,
    )
    return ProgressEntryResponse(**e)


@app.get("/api/progress/{user_id}", response_model=list[ProgressEntryResponse])
async def list_progress_entries(user_id: int, limit: int = 30):
    entries = await db.list_progress_entries(user_id, limit=limit)
    return [ProgressEntryResponse(**e) for e in entries]


@app.put("/api/progress/{entry_id}", response_model=ProgressEntryResponse)
async def update_progress_entry(entry_id: int, entry: ProgressEntryUpdate):
    existing = await db.get_progress_entry(entry_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Progress entry not found")

    update_data = entry.model_dump(exclude_unset=True)
    updated = await db.update_progress_entry(entry_id, **update_data)
    return ProgressEntryResponse(**updated) # pyright: ignore[reportCallIssue]


@app.delete("/api/progress/{entry_id}")
async def delete_progress_entry(entry_id: int):
    deleted = await db.delete_progress_entry(entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Progress entry not found")
    return {"detail": "Progress entry deleted"}


# ═══════════════════════════════════════════════════
# 10. CONVERSATION MEMORY
# Chapter Three: "Stores a compressed running summary
# of the dialogue, keeping the LLM's context window
# efficient while preserving continuity across sessions"
# ═══════════════════════════════════════════════════

@app.get("/api/memory/{user_id}", response_model=list[ConversationMemoryResponse])
async def list_conversation_memories(user_id: int):
    memories = await db.list_conversation_memories(user_id)
    return [ConversationMemoryResponse(**m) for m in memories]


@app.get("/api/memory/conversation/{conversation_id}", response_model=ConversationMemoryResponse)
async def get_conversation_memory(conversation_id: int):
    memory = await db.get_conversation_memory(conversation_id)
    if not memory:
        raise HTTPException(status_code=404, detail="No memory found for this conversation")
    return ConversationMemoryResponse(**memory)
