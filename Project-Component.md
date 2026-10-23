# Project Component — FitMateBOT

> **Fine-Tuning a Large Language Model (LLM) Agent for a Fitness Chatbot System**
> Emmanuel Amadigwe Charles — M.Sc. Computer Science

This document describes every component of the FitMate system, what each file and function does, and how the architecture maps to the thesis (Chapter Three).

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Frontend Pages (Next.js)](#2-frontend-pages-nextjs)
3. [React Components](#3-react-components)
4. [State Management (Zustand Stores)](#4-state-management-zustand-stores)
5. [Frontend Library Modules](#5-frontend-library-modules)
6. [Next.js API Routes (Orchestration Layer)](#6-nextjs-api-routes-orchestration-layer)
7. [Python FastAPI Backend (Canonical Server)](#7-python-fastapi-backend-canonical-server)
8. [Database Layer](#8-database-layer)
9. [Guardrail System](#9-guardrail-system)
10. [Chat Pipeline](#10-chat-pipeline)
11. [Design System & Styles](#11-design-system--styles)
12. [Configuration Files](#12-configuration-files)
13. [Files Excluded from Git](#13-files-excluded-from-git)

---

## 1. System Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│  Browser (React/Next.js)                             │
│  ├── Pages: /, /onboarding, /chat, /profile, /history│
│  ├── Components: chat, onboarding, UI                 │
│  └── Zustand Stores: localStorage persistence         │
└──────────────┬───────────────────────────────────────┘
               │ fetch() — same-origin API calls
               ▼
┌──────────────────────────────────────────────────────┐
│  Next.js API Routes (TypeScript)                     │
│  app/api/* — Orchestration + SQLite CRUD              │
│  lib/ — guardrails.ts, chat.ts, db.ts, api.ts        │
│  Database: SQLite via better-sqlite3 (sync)           │
└──────────────┬───────────────────────────────────────┘
               │ (Thesis design: REST API calls)
               ▼
┌──────────────────────────────────────────────────────┐
│  Python FastAPI Backend (Canonical per Chapter Three) │
│  main.py — 30 REST endpoints                         │
│  database.py — async SQLite via aiosqlite (11 tables)│
│  chat.py — LLM orchestration pipeline                 │
│  guardrails.py — content safety filter                │
│  models.py — Pydantic request/response schemas        │
│  Server: uvicorn on port 8000                         │
└──────────────┬───────────────────────────────────────┘
               │ httpx → OpenAI-compatible API
               ▼
┌──────────────────────────────────────────────────────┐
│  LLM Inference Service (OpenRouter API)                │
│  Requested model: openrouter/free                      │
│  Reported model: resolved provider model ID            │
│  Endpoint: /v1/chat/completions                        │
└──────────────────────────────────────────────────────┘
```

**Key architectural note:** Per thesis Chapter Three Section 3.5, the Python FastAPI backend is the canonical server. However, due to hosting cost and evaluation constraints, the current implementation uses **Next.js API routes** as the primary server, with SQLite accessed directly via `better-sqlite3`. The Python FastAPI backend (`backend/`) is maintained as the reference implementation and can be activated by switching the frontend API client to point to `localhost:8000` instead of same-origin routes.

---

## 2. Frontend Pages (Next.js)

### `app/layout.tsx` — Root Layout
- **Purpose:** Wraps all pages with Geist Sans + Geist Mono fonts
- **Exports:** `RootLayout` (default), `metadata` (title, description)
- **Functions:** Sets HTML lang, font CSS variables, antialiasing
- **Design:** Uses `--font-geist-sans` and `--font-geist-mono` CSS variables per DESIGN.md

### `app/page.tsx` — Root Redirect (`/`)
- **Purpose:** Pure redirector — no UI rendered
- **Logic:** Checks Zustand onboarding store for `userId`
  - Has userId → redirect to `/chat` (returning user)
  - No userId → redirect to `/onboarding` (first-time user)
- **States:** Hydration spinner while store loads from localStorage

### `app/globals.css` — Design Tokens & Global Styles
- **Purpose:** Defines the complete design system as CSS custom properties
- **Light theme tokens:** `--background: #ffffff`, `--primary: #16a34a`, `--foreground: #171717`, etc.
- **Dark theme:** Full dark mode via `prefers-color-scheme: dark` media query
- **Animation utilities:** `btn-press` (scale on click), `hover-lift` (translateY on hover)
- **Accessibility:** `prefers-reduced-motion` disables transforms
- **Custom scrollbars:** `.onboarding-scroll`, `.chat-scroll` styles

### `app/onboarding/page.tsx` — Onboarding Page (`/onboarding`)
- **Purpose:** Multi-step profile setup for new users
- **Route guard:** Redirects to `/chat` if onboarding already complete
- **Layout:** Mobile-first — full viewport on mobile, centered card on desktop
- **Renders:** `<OnboardingFlow />` component

### `app/chat/page.tsx` — Chat Landing (`/chat`)
- **Purpose:** Empty-state chat page — starts fresh on every visit
- **Route guard:** Redirects to `/onboarding` if user never completed setup
- **Actions:** Clears any stale messages from localStorage on mount
- **Renders:** `<FitMateChat />` component

### `app/chat/[conversationId]/page.tsx` — Conversation Page (`/chat/[uuid]`)
- **Purpose:** Loads and displays an existing conversation
- **UUID mapping:** Converts URL UUID to backend numeric ID via `conversation-mapping.ts`
- **Actions:** Fetches conversation detail from API, hydrates chat store
- **Error states:** Loading spinner, error with "Start new conversation" fallback

### `app/profile/page.tsx` — Profile Page (`/profile`)
- **Purpose:** View and edit user profile (name, age, gender, weight, height, fitness level, goals)
- **View mode:** Clean flat layout showing all profile data
- **Edit mode:** Form inputs with Save/Cancel — validates age (1-120), weight (20-300kg), height (50-250cm)
- **Sub-components:** `ViewMode`, `EditForm`, `Field`, `InfoRow`
- **Formatters:** `formatLevel()`, `formatGender()`, `formatGoal()`

### `app/history/page.tsx` — History Page (`/history`)
- **Purpose:** Shows all past conversations with titles, dates, and preview text
- **Route guard:** Redirects to `/onboarding` if not completed
- **Renders:** `<HistoryList />` component inside `<ChatHeader />`

---

## 3. React Components

### Chat Components

#### `components/chat/fitmate-chat.tsx` — Main Chat Orchestrator
- **Purpose:** Core chat interface — manages two visual states
- **State A (Empty):** Welcome screen + large centered input
- **State B (Active):** Messages scroll + compact bottom-docked input
- **Transitions:** Animated via `framer-motion` `<AnimatePresence>`
- **Functions:**
  - `handleSend()` — sends message via `sendMessage()` API, creates conversation, updates URL
  - `handleRegenerate()` — re-sends last user message, replaces last assistant response
  - `handleCancel()` — aborts in-flight HTTP request via `AbortController`
- **Dependencies:** `useOnboardingStore`, `useChatStore`, `sendMessage`, `getOrCreateUuid`

#### `components/chat/chat-input.tsx` — Message Input
- **Purpose:** Auto-resizing textarea with Dynamic Island aesthetic
- **Features:** Grows with content (40px compact → 140px max), send/pause button
- **Hook:** `useAutoResizeTextarea()` — adjusts textarea height based on content
- **Props:** `isCompact` (false = welcome mode, true = active chat mode)
- **Visual:** Rounded card, focus ring, backdrop blur, disclaimer text in compact mode

#### `components/chat/chat-messages.tsx` — Message List
- **Purpose:** Scrollable message list with auto-scroll and fade edges
- **Sub-components:**
  - `ChatBubble` — renders individual message (user = green, assistant = muted)
  - `TypingIndicator` — three pulsing dots during AI processing
- **Animations:** `fadeUp` keyframe (0.15s ease), smooth auto-scroll on new messages
- **Gradient fades:** Top and bottom fade edges blend messages into header/input

#### `components/chat/chat-bubble-actions.tsx` — Message Actions
- **Purpose:** Hover actions for chat messages (group-hover pattern)
- **Assistant messages:** Copy + Regenerate (last message only)
- **User messages:** Copy only
- **Copy:** Uses `navigator.clipboard.writeText()` with fallback for older browsers

#### `components/chat/chat-header.tsx` — Top Navigation Bar
- **Purpose:** Persistent header with branding + profile access
- **Left:** FitMate logo (Sparkles icon + text) — links to `/chat`
- **Right:** `<ProfileDropdown />` component

#### `components/chat/chat-welcome.tsx` — Empty State
- **Purpose:** Centered welcome message when no messages exist
- **Renders:** Sparkles icon + "Welcome back, {name}" + subtitle about WHO/ACE/HHS

### Onboarding Components

#### `components/onboarding/onboarding-flow.tsx` — Step Orchestrator
- **Purpose:** Manages 5-step onboarding sequence (0-4)
- **Steps:**
  - 0: Welcome screen
  - 1: Name input → updates store
  - 2: Body stats (age, gender, weight, height) → updates store
  - 3: Fitness level (beginner/intermediate/advanced) → updates store
  - 4: Goals (multi-select) → triggers backend save
- **Completion flow:** Calls `completeOnboarding()` which runs 3-phase backend flow:
  1. POST `/api/users` → creates user, gets user_id
  2. POST `/api/profiles` → creates profile with all body stats
  3. POST `/api/goals` × N → creates each fitness goal
- **Offline-first:** If backend unreachable, saves profile locally via Zustand persist

#### `components/onboarding/step-name.tsx` — Name Input Step
- **Purpose:** Collects user's name (1-100 characters)
- **Validation:** Required, non-empty after trim

#### `components/onboarding/step-stats.tsx` — Body Stats Step
- **Purpose:** Collects age, gender, weight, height
- **Fields:** Age (10-120), Gender (male/female/other/prefer_not_to_say), Weight (20-300kg), Height (50-250cm)

#### `components/onboarding/step-level.tsx` — Fitness Level Step
- **Purpose:** Selects fitness level with visual cards
- **Options:** Beginner, Intermediate, Advanced — each with icon + description

#### `components/onboarding/step-goals.tsx` — Goals Selection Step
- **Purpose:** Multi-select fitness goals
- **Options:** lose_weight, build_muscle, improve_endurance, general_health, learn_form, increase_flexibility

#### `components/onboarding/progress-dots.tsx` — Progress Indicator
- **Purpose:** Visual step progress (dots) during onboarding

#### `components/onboarding/step-icons.tsx` — Step Icons
- **Purpose:** SVG icons for onboarding step indicators

### UI Components

#### `components/ui/profile-dropdown.tsx` — Profile Menu
- **Purpose:** Radix DropdownMenu triggered by user initials button
- **Menu items:**
  1. My Profile → `/profile`
  2. New Chat → clears messages, navigates to `/chat`
  3. History → `/history`
  4. Reset Onboarding → clears store, redirects to `/onboarding`
- **Header:** Shows user name, fitness level, weight, height

#### `components/ui/onboarding-welcome-screen.tsx` — Welcome Hero
- **Purpose:** Full-viewport welcome screen with hero image + CTA
- **Image:** Unsplash fitness photo with ellipse clip-path
- **Animations:** Staggered fade-up via `framer-motion` variants

#### `components/ui/button.tsx` — Button Component
- **Purpose:** Reusable button with variants (Radix Slot pattern)
- **Uses:** `class-variance-authority` for variant styling

#### `components/ui/textarea.tsx` — Textarea Component
- **Purpose:** Styled textarea with forwardRef

#### `components/history/history-list.tsx` — Conversation History List
- **Purpose:** Scrollable list of past conversations
- **Features:**
  - Each card: title, relative date (`timeAgo()`), first message preview
  - Delete button (hover on desktop, always visible on touch)
  - Empty state with "Start a conversation" CTA
  - UUID mapping via `getOrCreateUuid()`

---

## 4. State Management (Zustand Stores)

### `store/onboarding-store.ts` — Onboarding State
- **Purpose:** Manages multi-step onboarding flow state
- **Persistence:** localStorage via Zustand `persist` middleware (key: `fitmate-onboarding`)
- **State:**
  - `currentStep` — Current step index (0-4)
  - `profile` — Accumulated user profile data
  - `isOnboardingComplete` — Whether onboarding finished
  - `userId` — Backend-assigned user ID
  - `_hasHydrated` — Whether store loaded from localStorage
- **Actions:** `setCurrentStep`, `nextStep`, `prevStep`, `updateProfile`, `completeOnboarding`, `resetOnboarding`, `setHasHydrated`
- **Partialize:** Only persists `currentStep`, `profile`, `isOnboardingComplete`, `userId`

### `store/chat-store.ts` — Chat Session State
- **Purpose:** Manages active chat messages and conversation state
- **Persistence:** localStorage via Zustand `persist` middleware (key: `fitmate-chat`)
- **State:**
  - `messages` — Array of `ChatMessage` (id, role, content, source, timestamp)
  - `conversationId` — Backend conversation ID (set after first message)
  - `isLoading` — Whether AI is processing
  - `_hasHydrated` — Whether store loaded from localStorage
- **Actions:** `addUserMessage`, `addAssistantMessage`, `addErrorMessage`, `setLoading`, `setConversationId`, `clearMessages`, `removeLastAssistantMessage`, `updateMessageContent`, `loadMessages`

---

## 5. Frontend Library Modules

### `lib/api.ts` — Frontend API Client
- **Purpose:** Thin fetch wrapper for all backend API calls
- **Base:** Same-origin `/api/*` routes (no CORS)
- **Functions:**
  - **User:** `createUser(name)`, `getUser(userId)`
  - **Profile:** `createProfile(payload)`, `getProfile(userId)`, `updateProfile(userId, payload)`
  - **Goals:** `createGoal(payload)`, `listGoals(userId)`
  - **Onboarding:** `completeOnboarding(data)` — runs 3-phase flow (user → profile → goals)
  - **Chat:** `sendMessage(userId, message, conversationId?, signal?)`, `listConversations(userId)`, `deleteConversation(userId, convId)`, `getConversationDetail(userId, convId)`, `getChatHistory(userId, convId?, limit?)`
  - **Health:** `checkHealth()`
  - **Onboarding status:** `getOnboardingStatus(userId)`

### `lib/db.ts` — SQLite Database Layer (Node.js)
- **Purpose:** Synchronous SQLite CRUD via `better-sqlite3`
- **Connection:** Singleton pattern with WAL journal mode + foreign keys
- **11 Tables:** users, profiles, fitness_goals, conversations, workout_plans, workout_exercises, nutrition_entries, chat_history, conversation_memory, progress_entries, exercises
- **Functions (35 total):**
  - `initDatabase()` — Creates all 11 tables (CREATE TABLE IF NOT EXISTS)
  - **Users:** `createUser`, `getUser`, `listUsers`
  - **Profiles:** `createProfile`, `getProfile`, `getProfileById`, `updateProfile`
  - **Goals:** `createFitnessGoal`, `getFitnessGoals`, `getFitnessGoal`, `updateFitnessGoal`, `deleteFitnessGoal`
  - **Conversations:** `createConversation`, `getConversation`, `listConversations`, `deleteConversation`, `updateConversationTitle`
  - **Workout Plans:** `createWorkoutPlan`, `getWorkoutPlan`, `listWorkoutPlans`, `updateWorkoutPlan`, `deleteWorkoutPlan`
  - **Workout Exercises:** `createWorkoutExercise`, `listWorkoutExercises`, `deleteWorkoutExercise`
  - **Exercises:** `createExercise`, `listExercises`, `searchExercises`
  - **Nutrition:** `createNutritionEntry`, `listNutritionEntries`, `getNutritionEntry`, `updateNutritionEntry`, `deleteNutritionEntry`
  - **Chat History:** `createChatEntry`, `listChatHistory`
  - **Conversation Memory:** `createConversationMemory`, `getConversationMemory`, `listConversationMemories`
  - **Progress:** `createProgressEntry`, `listProgressEntries`, `getProgressEntry`, `updateProgressEntry`, `deleteProgressEntry`
- **TypeScript interfaces:** `User`, `Profile`, `FitnessGoal`, `Conversation`, `WorkoutPlan`, `WorkoutExercise`, `NutritionEntry`, `ChatHistoryEntry`, `ConversationMemory`, `ProgressEntry`, `Exercise`

### `lib/chat.ts` — Stateless LLM Client (Node.js)
- **Purpose:** Prompt construction, server-side OpenRouter requests, and guardrail exports
- **Steps implemented:** Build the prompt from client-provided profile and conversation context, call OpenRouter, validate the provider response, and return response content with resolved model metadata
- **Functions:**
  - `buildPrompt(params)` — Constructs LLM message array: system prompt → profile context → memory summary → conversation history (last 10) → user message
  - `callLLMWithMetadata(messages)` — Server-side OpenRouter request with retries, timeout, response validation, and resolved model metadata
  - `callLLM(messages)` — Text-only wrapper for callers that do not need model metadata
- **Configuration:** `OPENROUTER_API_KEY` (preferred), `LLM_API_KEY` (compatibility), `LLM_API_BASE_URL`, `LLM_MODEL`
- **System prompt:** Defines FitMate persona — concise, direct, fitness-only, no emojis, no greetings

### `lib/guardrails.ts` — Content Safety Filter (Node.js)
- **Purpose:** Rule-based input/output guardrail system per GUARDRAIL-POLICY.md
- **Pattern lists (7 categories):**
  - `DANGEROUS_PATTERNS` (15) — Hard ban: eating disorders, self-harm, steroids, extreme diets
  - `MEDICAL_BAN_PATTERNS` (13) — Hard ban: diagnoses, prescriptions, surgery, mental health
  - `NON_FITNESS_PATTERNS` (15) — Hard ban: politics, religion, dating, coding, finance, legal
  - `MEDICAL_DISCLAIMER_PATTERNS` (23) — Not banned, trigger disclaimer injection
  - `SMALL_TALK_PATTERNS` (5) — Allowed but brief (greetings, thanks)
  - `FITNESS_KEYWORDS` (57) — Positive signal for fitness domain
  - `DIAGNOSIS_PATTERNS` (3) — Output check for medical diagnosis
- **Functions:**
  - `checkUserInput(text)` → `GuardrailResult` — Pre-model input check with priority cascade
  - `checkBotResponse(text)` → `GuardrailResult` — Post-model output check
  - `getGuardrailLogEntry(result)` → `dict` — Formats result for audit logging
- **Actions:** pass, refuse, disclaimer, rewrite

### `lib/conversation-mapping.ts` — UUID Mapping
- **Purpose:** Maps backend numeric conversation IDs to random UUIDs for URLs
- **Storage:** localStorage under key `fitmate-conversation-uuids`
- **Functions:**
  - `registerConversation(numericId)` → UUID — Register and return UUID
  - `resolveConversationId(uuid)` → numericId — Resolve UUID from URL
  - `getConversationUuid(numericId)` → UUID — Get UUID for navigation
  - `getOrCreateUuid(numericId)` → UUID — Get or create

### `lib/utils.ts` — Utility Functions
- **Purpose:** `cn()` — Merges Tailwind classes via `clsx` + `tailwind-merge`

---

## 6. Next.js API Routes (Orchestration Layer)

> **Note:** These routes handle the same-origin API calls from the frontend. Per thesis Chapter Three, the canonical backend is the Python FastAPI server. These routes were built as a cost-effective alternative that duplicates the FastAPI CRUD logic in TypeScript.

### `app/api/utils.ts` — Shared Route Utilities
- **Functions:**
  - `ensureDb()` — Initializes SQLite tables on first request (idempotent)
  - `errorResponse(message, status)` — Standard error JSON
  - `notFound(message)` — 404 response
  - `successResponse(data, status)` — 200 response
  - `createdResponse(data)` — 201 response
  - `parseBody<T>(req)` — JSON body parser with error handling
  - `getSearchParam(url, key)` — URL search params extractor

### `app/api/health/route.ts` — Health Check
- **GET** `/api/health` — Returns `{ status: "ok", service: "FitMate API", version: "1.0.0" }`

### `app/api/users/route.ts` — Users
- **POST** `/api/users` — Create user (onboarding step 1). Validates name required.
- **GET** `/api/users` — List all users (debug/demo)

### `app/api/users/[userId]/route.ts` — User by ID
- **GET** `/api/users/[userId]` — Get single user by ID

### `app/api/profiles/route.ts` — Profiles
- **POST** `/api/profiles` — Create profile (onboarding complete). Validates user exists, no duplicate profile.

### `app/api/profiles/[userId]/route.ts` — Profile by User ID
- **GET** `/api/profiles/[userId]` — Get profile by user ID
- **PUT** `/api/profiles/[userId]` — Update profile (partial updates supported)

### `app/api/onboarding/status/route.ts` — Onboarding Status
- **GET** `/api/onboarding/status?user_id=N` — Check if onboarding is complete

### `app/api/goals/route.ts` — Fitness Goals
- **POST** `/api/goals` — Create a fitness goal. Validates user exists.

### `app/api/goals/[userId]/route.ts` — Goals by User ID
- **GET** `/api/goals/[userId]` — List goals (optional `?status=` filter)

### `app/api/goals/detail/[goalId]/route.ts` — Goal CRUD
- **PUT** `/api/goals/detail/[goalId]` — Update a goal
- **DELETE** `/api/goals/detail/[goalId]` — Delete a goal

### `app/api/chat/route.ts` — Chat (Core Endpoint)
- **POST** `/api/chat` — Send message, get AI response
- **Pipeline:** Validates user → calls `processChatMessage()` from `lib/chat.ts` → returns response + metadata (guardrail status, model used)

### `app/api/conversations/route.ts` — Conversations
- **POST** `/api/conversations` — Create a new conversation

### `app/api/conversations/[userId]/route.ts` — Conversations by User
- **GET** `/api/conversations/[userId]` — List all conversations OR fetch single with history (`?conversationId=N`)
- **DELETE** `/api/conversations/[userId]?conversationId=N` — Delete conversation and related data

### `app/api/conversations/[userId]/chat-history/route.ts` — Chat History
- **GET** `/api/conversations/[userId]/chat-history` — Get chat history (optional `?conversation_id=N&limit=N`)

### `app/api/workout-plans/route.ts` — Workout Plans
- **POST** `/api/workout-plans` — Create workout plan
- **GET** `/api/workout-plans?user_id=N` — List plans (optional `?status=` filter)

### `app/api/workout-plans/[planId]/exercises/route.ts` — Plan Exercises
- **POST** `/api/workout-plans/[planId]/exercises` — Add exercise to plan
- **GET** `/api/workout-plans/[planId]/exercises` — List exercises in plan

### `app/api/workout-plans/detail/[planId]/route.ts` — Plan Detail
- **GET** `/api/workout-plans/detail/[planId]` — Get single plan
- **PUT** `/api/workout-plans/[planId]` — Update plan
- **DELETE** `/api/workout-plans/[planId]` — Delete plan

### `app/api/workout-exercises/[exerciseId]/route.ts` — Exercise Removal
- **DELETE** `/api/workout-exercises/[exerciseId]` — Remove exercise from plan

### `app/api/exercises/route.ts` — Exercise Catalog
- **POST** `/api/exercises` — Add exercise to catalog
- **GET** `/api/exercises` — List/search exercises (`?q=` or `?muscle_group=`)

### `app/api/nutrition/route.ts` — Nutrition
- **POST** `/api/nutrition` — Log a meal entry

### `app/api/nutrition/[userId]/route.ts` — Nutrition by User
- **GET** `/api/nutrition/[userId]` — List entries (optional `?date=` filter)

### `app/api/nutrition/detail/[entryId]/route.ts` — Nutrition Detail
- **PUT** `/api/nutrition/[entryId]` — Update entry
- **DELETE** `/api/nutrition/[entryId]` — Delete entry

### `app/api/progress/route.ts` — Progress
- **POST** `/api/progress` — Log a measurement entry

### `app/api/progress/[userId]/route.ts` — Progress by User
- **GET** `/api/progress/[userId]` — List entries (optional `?limit=N`)

### `app/api/progress/detail/[entryId]/route.ts` — Progress Detail
- **PUT** `/api/progress/[entryId]` — Update entry
- **DELETE** `/api/progress/[entryId]` — Delete entry

### `app/api/memory/[userId]/route.ts` — Conversation Memory
- **GET** `/api/memory/[userId]` — List all memories for user

### `app/api/memory/conversation/[conversationId]/route.ts` — Conversation Memory Detail
- **GET** `/api/memory/conversation/[conversationId]` — Get memory for specific conversation

---

## 7. Python FastAPI Backend (Canonical Server)

> **Note:** This is the thesis-canonical backend per Chapter Three. It runs separately on port 8000 via `uvicorn main:app --reload`. The frontend communicates with it via REST API calls (not currently active — the Next.js API routes serve as the primary backend due to cost/evaluation constraints).

### `backend/main.py` — FastAPI Entry Point
- **Purpose:** Application entry point with all 30 REST API endpoints
- **CORS:** Allows `localhost:3000`, `localhost:3001`, `127.0.0.1:3000`, `127.0.0.1:3001`
- **Lifespan:** Calls `db.init_db()` on startup
- **30 Endpoints:** Users (3), Profiles (4), Goals (4), Conversations (3), Chat (1), Workout Plans (5), Workout Exercises (3), Exercises (2), Nutrition (4), Progress (4), Memory (2), Health (1)

### `backend/database.py` — Async SQLite CRUD Layer
- **Purpose:** All database operations with `aiosqlite` (async)
- **11 Tables:** Same schema as `lib/db.ts` (Node.js version)
- **44 Functions:** Connection management, table creation, full CRUD for all entities
- **Notable:** Every function opens/closes its own connection (no pooling)

### `backend/models.py` — Pydantic Schemas
- **Purpose:** Request/response data validation for all endpoints
- **22 Classes:** UserCreate, UserResponse, ProfileCreate, ProfileUpdate, ProfileResponse, OnboardingStatusResponse, FitnessGoalCreate, FitnessGoalUpdate, FitnessGoalResponse, WorkoutPlanCreate, WorkoutPlanUpdate, WorkoutPlanResponse, ExerciseCreate, ExerciseResponse, WorkoutExerciseCreate, WorkoutExerciseResponse, NutritionEntryCreate, NutritionEntryUpdate, NutritionEntryResponse, ChatRequest, ChatResponse, ChatHistoryEntry, ConversationMemoryResponse, ProgressEntryCreate, ProgressEntryUpdate, ProgressEntryResponse, ConversationResponse

### `backend/chat.py` — LLM Chat Orchestration
- **Purpose:** Full chat pipeline per Chapter Three Section 3.5.2
- **5 Functions:**
  - `build_prompt()` — Constructs LLM message array
  - `_format_profile_context()` — Formats user profile for prompt
  - `_format_conversation_history()` — Formats last 10 exchanges
  - `call_llm()` — Async HTTP POST to OpenRouter via `httpx`
  - `process_chat_message()` — Main 10-step pipeline

### `backend/guardrails.py` — Content Safety Filter
- **Purpose:** Rule-based guardrail system (Python version)
- **Pattern lists:** DANGEROUS_PATTERNS (15), MEDICAL_BAN_PATTERNS (13), NON_FITNESS_PATTERNS (15), MEDICAL_DISCLAIMER_PATTERNS (23), SMALL_TALK_PATTERNS (5), FITNESS_KEYWORDS (57)
- **3 Functions:** `check_user_input()`, `check_bot_response()`, `get_guardrail_log_entry()`
- **Dataclass:** `GuardrailResult` (passed, action, rule, message, original_text)

### `backend/requirements.txt` — Python Dependencies
```
fastapi              # Web framework
uvicorn[standard]    # ASGI server
aiosqlite            # Async SQLite driver
pydantic             # Data validation
python-dotenv        # .env file loading
httpx                # Async HTTP client (for LLM API calls)
```

### `backend/.env.example` — Environment Variables Template
| Variable | Purpose |
|---|---|
| `DATABASE_PATH` | SQLite file path (default: `./fitmate.db`) |
| `LLM_API_BASE_URL` | LLM API endpoint |
| `LLM_API_KEY` | API authentication key |
| `LLM_MODEL` | Actual model slug for API calls |
| `LLM_DISPLAY_MODEL` | Display name for thesis |
| `CORS_ORIGINS` | Allowed frontend origins |

---

## 8. Database Layer

### 11 Tables (Chapter Three Section 3.5.4)

| # | Table | Purpose | Key Fields |
|---|---|---|---|
| 1 | `users` | User identity | id, name, created_at |
| 2 | `profiles` | Body stats + fitness level | user_id (FK), age, gender, weight_kg, height_cm, fitness_level, medical_flags, onboarding_complete |
| 3 | `fitness_goals` | User fitness goals | user_id (FK), goal_type, target_value, target_unit, status |
| 4 | `conversations` | Chat session groups | user_id (FK), title |
| 5 | `workout_plans` | Exercise routines | user_id (FK), name, days_per_week, duration_weeks, status |
| 6 | `workout_exercises` | Exercises within plans | workout_plan_id (FK), exercise_name, sets, reps, duration_seconds |
| 7 | `nutrition_entries` | Meal logging | user_id (FK), date, meal_type, calories, protein_g, carbs_g, fat_g |
| 8 | `chat_history` | Every user-agent exchange | user_id (FK), conversation_id (FK), user_input, bot_response, guardrail_triggered, response_time_ms |
| 9 | `conversation_memory` | Compressed dialogue summaries | user_id (FK), conversation_id (FK), summary |
| 10 | `progress_entries` | Periodic measurements | user_id (FK), date, weight_kg, body_fat_pct, bench_press_max_kg, squat_max_kg, deadlift_max_kg |
| 11 | `exercises` | Reference exercise catalog | name (UNIQUE), muscle_group, equipment, difficulty |

### Relationships
```
users (1) ──→ (N) profiles          [CASCADE DELETE]
users (1) ──→ (N) fitness_goals     [CASCADE DELETE]
users (1) ──→ (N) conversations     [CASCADE DELETE]
users (1) ──→ (N) workout_plans     [CASCADE DELETE]
users (1) ──→ (N) nutrition_entries  [CASCADE DELETE]
users (1) ──→ (N) chat_history      [CASCADE DELETE]
users (1) ──→ (N) conversation_memory [CASCADE DELETE]
users (1) ──→ (N) progress_entries  [CASCADE DELETE]
workout_plans (1) ──→ (N) workout_exercises [CASCADE DELETE]
conversations (1) ──→ (N) chat_history      [SET NULL on delete]
conversations (1) ──→ (N) conversation_memory [CASCADE DELETE]
```

---

## 9. Guardrail System

Per GUARDRAIL-POLICY.md and Chapter Three Section 3.5.1 stage (9):

### Input Guardrail (Pre-Model)
1. **Dangerous content** (HARD BAN) — eating disorders, self-harm, steroids, extreme diets
2. **Medical/clinical** (HARD BAN) — diagnoses, prescriptions, surgery, mental health
3. **Non-fitness topics** (HARD BAN) — politics, religion, dating, coding, finance, legal
4. **Small talk** (ALLOW, brief) — greetings, thanks, "who made you"
5. **Medical disclaimer triggers** (FLAG) — injury, pain, conditions, BMI
6. **Fitness domain** (POSITIVE SIGNAL) — workout, exercise, protein, etc.

### Output Guardrail (Post-Model)
1. **Dangerous content** — Blocks harmful responses
2. **Medical diagnosis** — Blocks "you have..." phrasing
3. **Disclaimer injection** — Appends medical disclaimer when needed

### Audit Logging
Every guardrail trigger is logged with: timestamp, input preview (100 chars), triggered rule, action taken.

---

## 10. Chat Pipeline

Per Chapter Three Section 3.5.2 flowchart:

```
(1) User submits question
(2) Backend receives and pre-processes request
(3) Query converted to embedding vector [FUTURE: RAG]
(4) Vector DB retrieves knowledge [FUTURE: RAG]
(5) Prompt engineering layer constructs final prompt
(6) Fine-tuned model generates draft response
(7) Guardrail layer validates response
(8) Response returned to user
(9) Conversation and progress data stored
```

**Implemented:** Steps 1, 2, 5, 6, 7, 8, 9
**Not yet implemented:** Steps 3, 4 (RAG pipeline — future work)

### Prompt Construction
```
[System Prompt — FitMate persona]
[User Profile Context — age, weight, height, fitness level]
[Conversation Memory — compressed summary from prior sessions]
[Recent Conversation — last 10 exchanges]
[User Message]
```

### LLM Configuration
| Parameter | Value |
|---|---|
| Requested Model | `openrouter/free` |
| Reported Model | Resolved OpenRouter model ID from each completion |
| API Endpoint | OpenRouter `/api/v1/chat/completions` |
| Max Tokens | 1024 |
| Temperature | 0.7 |
| Top P | 0.9 |
| Timeout | 30 seconds |
| Retries | 2 attempts |

---

## 11. Design System & Styles

### Design Tokens (CSS Custom Properties)
| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | `#ffffff` | `#0a0a0a` | Page background |
| `--foreground` | `#171717` | `#ededed` | Primary text |
| `--primary` | `#16a34a` | `#22c55e` | Action color (buttons, links) |
| `--primary-light` | `#22c55e` | `#4ade80` | Hover states |
| `--muted` | `#f5f5f5` | `#1a1a1a` | Secondary surfaces |
| `--muted-foreground` | `#737373` | `#a3a3a3` | Secondary text |
| `--border` | `#e5e5e5` | `#262626` | Cards, dividers |
| `--destructive` | `#ef4444` | `#dc2626` | Error/danger |
| `--radius` | `0.75rem` | `0.75rem` | Border radius |

### Typography
- **UI:** Geist Sans (`--font-geist-sans`)
- **Code/Citations:** Geist Mono (`--font-geist-mono`)

### Animation Classes
- `.btn-press` — Scale 0.97 on active (160ms cubic-bezier)
- `.hover-lift` — translateY(-1px) + box-shadow on hover (fine pointer only)

---

## 12. Configuration Files

### `package.json` — Dependencies
| Package | Version | Purpose |
|---|---|---|
| `next` | ^16.2.12 | React framework |
| `react` / `react-dom` | 19.2.4 | UI library |
| `better-sqlite3` | ^13.0.2 | SQLite driver (Node.js) |
| `zustand` | ^5.0.14 | State management |
| `framer-motion` | ^12.43.0 | Animations |
| `lucide-react` | ^1.28.0 | Icons |
| `@radix-ui/react-dropdown-menu` | ^2.1.24 | Accessible dropdown |
| `class-variance-authority` | ^0.7.1 | Variant styling |
| `tailwind-merge` | ^3.6.0 | Class merging |
| `clsx` | ^2.1.1 | Conditional classes |

### `tsconfig.json` — TypeScript Config
- **Target:** ES2017
- **Module:** ESNext with bundler resolution
- **Strict mode:** Enabled
- **Path alias:** `@/*` → `./*`

### `next.config.ts` — Next.js Config
- Empty configuration (defaults)

---

## 13. Files Excluded from Git

The following files/directories are listed in `.gitignore` and will NOT be pushed to the repository:

### Environment & Secrets
- `.env*` — All environment variable files (contains API keys, database paths)

### Build Artifacts
- `node_modules/` — Dependencies
- `.next/` — Next.js build output
- `out/` — Static export
- `/build` — Production build
- `coverage/` — Test coverage
- `*.tsbuildinfo` — TypeScript build info
- `next-env.d.ts` — Next.js TypeScript declarations

### Documentation & AI Config
- `CLAUDE.md` — Claude Code instructions
- `CONTEXT.md` — Project context document
- `PRODUCT.md` — Product specification
- `DESIGN.md` — Design system document
- `instructions/` — Architecture, guardrail policy, build guide
- `.agents/` — Agent configurations
- `.claude/` — Claude Code settings
- `.impeccable/` — Design system config
- `surface-briefs/` — UX briefs
- `.codex/` — Codex config
- `skills-lock.json` — Skills lock file

### Cleanup Targets (files to remove from tracking)
- `docs/superpowers/` — Superpowers documentation (already gitignored, but one file is still tracked)

### System Files
- `.DS_Store` — macOS metadata
- `*.pem` — Certificate files
- `.vercel` — Vercel deployment config

---

*Document generated by Claude Code — FitMateBOT Project Component Inventory*
*Last updated: 2026-08-02*
