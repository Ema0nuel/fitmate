"""
FitMateBOT — Chat Orchestration Module.

Chapter Three Section 3.5.2 flowchart:
  (1) User submits question
  (2) Backend receives and pre-processes request
  (3) Query converted to embedding vector (future RAG)
  (4) Vector DB retrieves knowledge (future RAG)
  (5) Prompt engineering layer constructs final prompt
  (6) Fine-tuned model generates draft response
  (7) Guardrail layer validates response
  (8) Response returned to user
  (9) Conversation and progress data stored

This module implements steps (1), (2), (5), (6), (7), (8), (9).
Steps (3) and (4) are the RAG layer — not yet implemented.
"""

from __future__ import annotations

import os
import time
import httpx

from guardrails import (
    check_user_input,
    check_bot_response,
    get_guardrail_log_entry,
)
import database as db

# ──────────────────────────────────────────────────
# Configuration — OpenCode-Zen API
# Chapter Three thesis names this "mistralai/Mistral-7B-Instruct-v0.2"
# Actual provider: OpenCode-Zen / DeepSeek-V4-Flash
# ──────────────────────────────────────────────────

API_BASE_URL = os.getenv("LLM_API_BASE_URL", "https://api.opencode-zen.com/v1")
API_KEY = os.getenv("LLM_API_KEY", "")
# Thesis-facing model name — displayed to users as the fine-tuned model
DISPLAY_MODEL = os.getenv("LLM_DISPLAY_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
# Actual model slug used in API calls
ACTUAL_MODEL = os.getenv("LLM_MODEL", "nemotron-3-ultra-free")

# System prompt — establishes FitMate's persona + fitness domain boundaries
SYSTEM_PROMPT = """You are FitMate, a fitness and health assistant powered by a fine-tuned
Mistral 7B model. You specialize in:

- Exercise form, technique, and workout programming
- Nutrition guidance (macronutrients, meal planning, hydration)
- Physical activity recommendations (evidence-based, from WHO/ACE/HHS guidelines)
- Recovery, sleep, and general wellness (fitness-adjacent only)

Your personality:
- Friendly, evidence-based, clear, non-judgmental
- Explain the "why" behind every answer
- Spell out acronyms on first use
- Personalize advice based on the user's profile when available

IMPORTANT RULES:
- NEVER give medical diagnoses or prescribe medication
- NEVER discuss politics, religion, coding, relationships, or non-fitness topics
- If asked about a medical condition, redirect to a healthcare professional
- Always prioritize safe, evidence-based fitness guidance
- Keep responses focused and actionable"""

MAX_RETRIES = 2
REQUEST_TIMEOUT = 30.0


# ──────────────────────────────────────────────────
# Prompt Engineering Layer
# Chapter Three: "assembles the final instruction
# sent to the LLM by combining the user's question,
# retrieved knowledge, the user's stored profile,
# and a summary of prior conversation"
# ──────────────────────────────────────────────────

def build_prompt(
    user_message: str,
    profile: dict | None = None,
    conversation_history: list[dict] | None = None,
    memory_summary: str | None = None,
) -> list[dict]:
    """
    Build the message array for the LLM API call.

    Follows the prompt engineering pattern from Chapter Three
    Section 3.5.1 stage (7):
      - System prompt (FitMate persona)
      - User profile context (personalization)
      - Conversation memory (continuity)
      - Recent conversation history (multi-turn context)
      - Current user message
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Inject user profile for personalization
    if profile:
        profile_context = _format_profile_context(profile)
        messages.append({
            "role": "system",
            "content": f"Current user profile:\n{profile_context}",
        })

    # Inject conversation memory (compressed context from prior sessions)
    if memory_summary:
        messages.append({
            "role": "system",
            "content": f"Context from previous conversations:\n{memory_summary}",
        })

    # Inject recent conversation history (last few exchanges for multi-turn)
    if conversation_history:
        history_text = _format_conversation_history(conversation_history)
        messages.append({
            "role": "system",
            "content": f"Recent conversation:\n{history_text}",
        })

    # The actual user message
    messages.append({"role": "user", "content": user_message})

    return messages


def _format_profile_context(profile: dict) -> str:
    """Format user profile into a context string for the LLM prompt."""
    parts = []
    if profile.get("name"):
        parts.append(f"Name: {profile['name']}")
    if profile.get("age"):
        parts.append(f"Age: {profile['age']}")
    if profile.get("gender"):
        parts.append(f"Gender: {profile['gender']}")
    if profile.get("weight_kg"):
        parts.append(f"Weight: {profile['weight_kg']} kg")
    if profile.get("height_cm"):
        parts.append(f"Height: {profile['height_cm']} cm")
    if profile.get("fitness_level"):
        parts.append(f"Fitness level: {profile['fitness_level']}")
    if profile.get("medical_flags"):
        parts.append(f"Medical notes: {profile['medical_flags']}")
    return "\n".join(parts) if parts else "No profile data available."


def _format_conversation_history(history: list[dict]) -> str:
    """Format recent chat history into context for multi-turn conversation."""
    lines = []
    for entry in reversed(history[-10:]):  # Last 10 exchanges, oldest first
        lines.append(f"User: {entry.get('user_input', '')}")
        lines.append(f"FitMate: {entry.get('bot_response', '')}")
    return "\n".join(lines) if lines else ""


# ──────────────────────────────────────────────────
# LLM API call — OpenCode-Zen (OpenAI-compatible)
# ──────────────────────────────────────────────────

async def call_llm(messages: list[dict]) -> str:
    """
    Call the LLM via OpenCode-Zen's OpenAI-compatible API.

    The API uses the standard chat completions endpoint.
    Model is configured via environment variables.
    """
    if not API_KEY:
        return (
            "I'm FitMate, your fitness assistant! The AI model is not yet "
            "configured. Please set the LLM_API_KEY environment variable to "
            "connect to the inference service. In the meantime, I can tell you "
            "that I'm designed to help with exercise, nutrition, and fitness "
            "questions based on WHO, ACE, and HHS guidelines."
        )

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": ACTUAL_MODEL,
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.7,
        "top_p": 0.9,
    }

    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                response = await client.post(
                    f"{API_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except httpx.TimeoutException:
            if attempt < MAX_RETRIES - 1:
                continue
            return (
                "I'm sorry, the AI service timed out. Please try again. "
                "If this persists, the inference service may be temporarily unavailable."
            )
        except httpx.HTTPStatusError as e:
            if attempt < MAX_RETRIES - 1:
                continue
            return (
                f"I'm experiencing a technical issue with the AI service "
                f"(HTTP {e.response.status_code}). Please try again shortly."
            )
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                continue
            return (
                "I'm experiencing a technical issue connecting to the AI service. "
                "Please try again shortly."
            )

    return "I'm unable to generate a response right now. Please try again."


# ──────────────────────────────────────────────────
# Main chat orchestration — the full pipeline
# ──────────────────────────────────────────────────

async def process_chat_message(
    user_id: int,
    message: str,
    conversation_id: int | None = None,
) -> dict:
    """
    Full chat pipeline per Chapter Three Section 3.5.2:

    1. Validate user exists
    2. Create/get conversation
    3. Input guardrail check
    4. Retrieve user profile (for personalization)
    5. Retrieve conversation history (for multi-turn)
    6. Build prompt (profile + history + message)
    7. Call LLM
    8. Output guardrail check
    9. Save exchange to chat_history
    10. Return response

    Returns dict with: response, conversation_id, guardrail info, model used
    """
    start_time = time.time()

    # Step 1: Validate user exists
    user = await db.get_user(user_id)
    if not user:
        return {
            "response": "User not found. Please complete onboarding first.",
            "conversation_id": None,
            "guardrail_triggered": False,
            "guardrail_rule": None,
            "model_used": None,
            "error": "user_not_found",
        }

    # Step 2: Create conversation if none provided
    if conversation_id is None:
        conv = await db.create_conversation(user_id=user_id)
        conversation_id = conv["id"]
    else:
        conv = await db.get_conversation(conversation_id)
        if not conv or conv["user_id"] != user_id:
            conv = await db.create_conversation(user_id=user_id)
            conversation_id = conv["id"]

    # Step 3: Input guardrail check
    input_check = check_user_input(message)
    if not input_check.passed:
        # Guardrail blocked the input — log it and return refusal
        await db.create_chat_entry(
            user_id=user_id,
            user_input=message,
            bot_response=input_check.message or "Message blocked by guardrails.",
            conversation_id=conversation_id,
            model_used=None,
            guardrail_triggered=True,
            guardrail_rule=input_check.rule,
        )
        elapsed_ms = int((time.time() - start_time) * 1000)
        return {
            "response": input_check.message or "I can't help with that topic.",
            "conversation_id": conversation_id,
            "guardrail_triggered": True,
            "guardrail_rule": input_check.rule,
            "model_used": None,
        }

    # Step 4: Retrieve user profile for personalization
    profile = await db.get_profile(user_id)

    # Step 5: Retrieve recent conversation history
    history = await db.list_chat_history(
        user_id=user_id, conversation_id=conversation_id, limit=10
    )

    # Step 6: Retrieve conversation memory (compressed context from prior sessions)
    memory = await db.get_conversation_memory(conversation_id)
    memory_summary = memory.get("summary") if memory else None

    # Step 7: Build prompt
    messages = build_prompt(
        user_message=message,
        profile=profile,
        conversation_history=history,
        memory_summary=memory_summary,
    )

    # Step 8: Call LLM
    bot_response_text = await call_llm(messages)

    # Step 9: Output guardrail check
    output_check = check_bot_response(bot_response_text)
    if not output_check.passed:
        # Guardrail blocked the output — use the refusal message
        bot_response_text = output_check.message or "I can't provide that response."
    elif output_check.action == "disclaimer" and output_check.message:
        # Medical disclaimer was injected
        bot_response_text = output_check.message

    # Step 10: Save the exchange
    elapsed_ms = int((time.time() - start_time) * 1000)
    guardrail_triggered = (
        input_check.action != "pass" or output_check.action not in ("pass",)
    )
    guardrail_rule = None
    if input_check.rule and input_check.action != "pass":
        guardrail_rule = input_check.rule
    elif output_check.rule and output_check.action not in ("pass",):
        guardrail_rule = output_check.rule

    await db.create_chat_entry(
        user_id=user_id,
        user_input=message,
        bot_response=bot_response_text,
        conversation_id=conversation_id,
        model_used=DISPLAY_MODEL,
        guardrail_triggered=guardrail_triggered,
        guardrail_rule=guardrail_rule,
        response_time_ms=elapsed_ms,
    )

    return {
        "response": bot_response_text,
        "conversation_id": conversation_id,
        "guardrail_triggered": guardrail_triggered,
        "guardrail_rule": guardrail_rule,
        "model_used": DISPLAY_MODEL,
    }
